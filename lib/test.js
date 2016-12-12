'use strict';
const inspect = require('util').inspect;
const isGeneratorFn = require('is-generator-fn');
const maxTimeout = require('max-timeout');
const Promise = require('bluebird');
const fnName = require('fn-name');
const co = require('co-with-promise');
const observableToPromise = require('observable-to-promise');
const isPromise = require('is-promise');
const isObservable = require('is-observable');
const plur = require('plur');
const assert = require('./assert');
const enhanceAssert = require('./enhance-assert');
const globals = require('./globals');
const throwsHelper = require('./throws-helper');
const formatter = enhanceAssert.formatter();

function Test(title, fn, contextRef, report) {
	if (!(this instanceof Test)) {
		throw new TypeError('Class constructor Test cannot be invoked without \'new\'');
	}

	if (typeof title === 'function') {
		contextRef = fn;
		fn = title;
		title = null;
	}

	assert.is(typeof fn, 'function', 'you must provide a callback');

	this.title = title || fnName(fn) || '[anonymous]';
	this.fn = isGeneratorFn(fn) ? co.wrap(fn) : fn;
	this.assertions = [];
	this.planCount = null;
	this.duration = null;
	this.assertError = undefined;
	this.sync = true;
	this.contextRef = contextRef;
	this.report = report;
	this.threwSync = false;

	// TODO(jamestalmage): Make this an optional constructor arg instead of having Runner set it after the fact.
	// metadata should just always exist, otherwise it requires a bunch of ugly checks all over the place.
	this.metadata = {};

	// Store the time point before test execution
	// to calculate the total time spent in test
	this._timeStart = null;

	// Workaround for Babel giving anonymous functions a name
	if (this.title === 'callee$0$0') {
		this.title = '[anonymous]';
	}
}

module.exports = Test;

Object.defineProperty(Test.prototype, 'assertCount', {
	enumerable: true,
	get() {
		return this.assertions.length;
	}
});

Test.prototype._assert = function (promise) {
	if (isPromise(promise)) {
		this.sync = false;
	}

	this.assertions.push(promise);
};

Test.prototype._setAssertError = function (err) {
	throwsHelper(err);
	if (this.assertError !== undefined) {
		return;
	}

	this.assertError = err;
};

Test.prototype.plan = function (count, planStack) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this.planCount = count;

	// In case the `planCount` doesn't match `assertCount,
	// we need the stack of this function to throw with a useful stack
	this.planStack = planStack;
};

Test.prototype._run = function () {
	let ret;

	try {
		ret = this.fn(this._publicApi());
	} catch (err) {
		this.threwSync = true;
		if (err instanceof Error) {
			this._setAssertError(err);
		} else {
			this._setAssertError(new assert.AssertionError({
				actual: err,
				message: 'Non-error thrown with value: ' + inspect(err, {depth: null}),
				operator: 'catch'
			}));
		}
	}

	return ret;
};

Test.prototype.promise = function () {
	const self = this;

	if (!this._promise) {
		this._promise = {};

		this._promise.promise = new Promise((resolve, reject) => { // eslint-disable-line no-use-extend-native/no-use-extend-native
			self._promise.resolve = resolve;
			self._promise.reject = reject;
		}).tap(result => {
			if (self.report) {
				self.report(result);
			}
		});
	}

	return this._promise;
};

Test.prototype.run = function () {
	if (this.metadata.callback) {
		this.sync = false;
	}

	this._timeStart = globals.now();

	// Wait until all assertions are complete
	this._timeout = globals.setTimeout(() => {}, maxTimeout);

	let ret = this._run();

	let asyncType = 'promises';

	if (isObservable(ret)) {
		asyncType = 'observables';
		ret = observableToPromise(ret);
	}

	if (isPromise(ret)) {
		this.sync = false;

		if (this.metadata.callback) {
			this._setAssertError(new Error(`Do not return ${asyncType} from tests declared via \`test.cb(...)\`, if you want to return a promise simply declare the test via \`test(...)\``));
		}

		ret.then(
			() => {
				this.exit();
			},
			err => {
				if (!(err instanceof Error)) {
					err = new assert.AssertionError({
						actual: err,
						message: `Promise rejected with: ${inspect(err, {depth: null})}`,
						operator: 'promise'
					});
				}

				this._setAssertError(err);
				this.exit();
			});

		return this.promise().promise;
	}

	if (this.metadata.callback && !this.threwSync) {
		return this.promise().promise;
	}

	return this.exit();
};

Test.prototype._result = function () {
	let reason = this.assertError;
	let passed = reason === undefined;

	if (this.metadata.failing) {
		passed = !passed;

		if (passed) {
			reason = undefined;
		} else {
			reason = new Error('Test was expected to fail, but succeeded, you should stop marking the test as failing');
		}
	}

	return {
		passed,
		result: this,
		reason
	};
};

Object.defineProperty(Test.prototype, 'end', {
	get() {
		if (this.metadata.callback) {
			return this._end.bind(this);
		}

		throw new Error('t.end is not supported in this context. To use t.end as a callback, you must use "callback mode" via `test.cb(testName, fn)`');
	}
});

Test.prototype._end = function (err) {
	if (err) {
		if (!(err instanceof Error)) {
			err = new assert.AssertionError({
				actual: err,
				message: 'Callback called with an error: ' + inspect(err, {depth: null}),
				operator: 'callback'
			});
		}

		this._setAssertError(err);
		this.exit();

		return;
	}

	if (this.endCalled) {
		this._setAssertError(new Error('.end() called more than once'));
		return;
	}

	this.endCalled = true;
	this.exit();
};

Test.prototype._checkPlanCount = function () {
	if (this.assertError === undefined && this.planCount !== null && this.planCount !== this.assertions.length) {
		this._setAssertError(new assert.AssertionError({
			actual: this.assertions.length,
			expected: this.planCount,
			message: `Planned for ${this.planCount} ${plur('assertion', this.planCount)}, but got ${this.assertions.length}.`,
			operator: 'plan'
		}));

		this.assertError.stack = this.planStack;
	}
};

Test.prototype.exit = function () {
	this._checkPlanCount();

	if (this.sync || this.threwSync) {
		this.duration = globals.now() - this._timeStart;
		globals.clearTimeout(this._timeout);

		const result = this._result();

		if (this.report) {
			this.report(result);
		}

		return result;
	}

	Promise.all(this.assertions)
		.catch(err => {
			this._setAssertError(err);
		})
		.finally(() => {
			// Calculate total time spent in test
			this.duration = globals.now() - this._timeStart;

			// Stop infinite timer
			globals.clearTimeout(this._timeout);

			this._checkPlanCount();

			this.promise().resolve(this._result());
		});

	return this.promise().promise;
};

Test.prototype._publicApi = function () {
	return new PublicApi(this);
};

function PublicApi(test) {
	this._test = test;
	this.skip = new SkipApi(test);
}

function onAssertionEvent(event) {
	if (event.assertionThrew) {
		if (event.powerAssertContext) {
			event.error.message = formatter(event.powerAssertContext);
			if (event.originalMessage) {
				event.error.message = event.originalMessage + ' ' + event.error.message;
			}
		}
		this._test._setAssertError(event.error);
		this._test._assert(null);
		return null;
	}

	let ret = event.returnValue;

	if (isObservable(ret)) {
		ret = observableToPromise(ret);
	}

	if (isPromise(ret)) {
		const promise = ret.then(null, err => {
			err.originalMessage = event.originalMessage;
			throw err;
		});

		this._test._assert(promise);

		return promise;
	}

	this._test._assert(null);

	return ret;
}

PublicApi.prototype = enhanceAssert({
	assert,
	onSuccess: onAssertionEvent,
	onError: onAssertionEvent
});

PublicApi.prototype.plan = function plan(ct) {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = 1;
	const obj = {};
	Error.captureStackTrace(obj, plan);
	Error.stackTraceLimit = limitBefore;
	this._test.plan(ct, obj.stack);
};

// Getters
[
	'assertCount',
	'title',
	'end'
]
	.forEach(name => {
		Object.defineProperty(PublicApi.prototype, name, {
			enumerable: false,
			get() {
				return this._test[name];
			}
		});
	});

// Get / Set
Object.defineProperty(PublicApi.prototype, 'context', {
	enumerable: true,
	get() {
		const contextRef = this._test.contextRef;
		return contextRef && contextRef.context;
	},
	set(context) {
		const contextRef = this._test.contextRef;

		if (!contextRef) {
			this._test._setAssertError(new Error('t.context is not available in ' + this._test.metadata.type + ' tests'));
			return;
		}

		contextRef.context = context;
	}
});

function skipFn() {
	return this._test._assert(null);
}

function SkipApi(test) {
	this._test = test;
}

Object.keys(assert).forEach(el => {
	SkipApi.prototype[el] = skipFn;
});
