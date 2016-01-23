'use strict';
var isGeneratorFn = require('is-generator-fn');
var maxTimeout = require('max-timeout');
var Promise = require('bluebird');
var fnName = require('fn-name');
var co = require('co-with-promise');
var observableToPromise = require('observable-to-promise');
var isPromise = require('is-promise');
var isObservable = require('is-observable');
var assert = require('./assert');
var AvaError = require('./ava-error');
var enhanceAssert = require('./enhance-assert');
var globals = require('./globals');

function Test(title, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, fn);
	}

	if (typeof title === 'function') {
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

	// TODO(jamestalmage): make this an optional constructor arg instead of having Runner set it after the fact.
	// metadata should just always exist, otherwise it requires a bunch of ugly checks all over the place.
	this.metadata = {};

	// store the time point before test execution
	// to calculate the total time spent in test
	this._timeStart = null;

	// workaround for Babel giving anonymous functions a name
	if (this.title === 'callee$0$0') {
		this.title = '[anonymous]';
	}
}

module.exports = Test;

Object.defineProperty(Test.prototype, 'assertCount', {
	enumerable: true,
	get: function () {
		return this.assertions.length;
	}
});

Test.prototype._assert = function (promise) {
	this.assertions.push(promise);
};

Test.prototype._setAssertError = function (err) {
	if (this.assertError !== undefined) {
		return;
	}

	if (err === undefined) {
		err = 'undefined';
	}

	this.assertError = err;
};

Test.prototype.plan = function (count) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this.planCount = count;
};

Test.prototype._run = function () {
	var ret;
	try {
		ret = this.fn(this._publicApi());
	} catch (err) {
		this._setAssertError(err);
		this.exit();
	}
	return ret;
};

Test.prototype.run = function () {
	var self = this;

	this.promise = {};
	this.promise.promise = new Promise(function (resolve, reject) {
		self.promise.resolve = resolve;
		self.promise.reject = reject;
	});

	this._timeStart = globals.now();

	// wait until all assertions are complete
	this._timeout = globals.setTimeout(function () {}, maxTimeout);

	var ret = this._run();

	var asyncType = 'promises';

	if (isObservable(ret)) {
		asyncType = 'observables';
		ret = observableToPromise(ret);
	}

	if (isPromise(ret)) {
		if (this.metadata.callback) {
			self._setAssertError(new Error('Do not return ' + asyncType + ' from tests declared via `test.cb(...)`, if you want to return a promise simply declare the test via `test(...)`'));
			this.exit();
			return this.promise.promise;
		}

		ret
			.then(function () {
				self.exit();
			})
			.catch(function (err) {
				if (!(err instanceof Error)) {
					err = new assert.AssertionError({
						actual: err,
						message: 'Promise rejected with "' + err + '"',
						operator: 'promise'
					});
				}

				self._setAssertError(err);
				self.exit();
			});
	} else if (!this.metadata.callback) {
		this.exit();
	}

	return this.promise.promise;
};

Object.defineProperty(Test.prototype, 'end', {
	get: function () {
		if (this.metadata.callback) {
			return this._end.bind(this);
		}
		throw new Error('t.end is not supported in this context. To use t.end as a callback, you must use "callback mode" via `test.cb(testName, fn)` ');
	}
});

Test.prototype._end = function (err) {
	if (err) {
		this._setAssertError(new assert.AssertionError({
			actual: err,
			message: 'Callback called with an error → ' + err,
			operator: 'callback'
		}));

		this.exit();
		return;
	}

	if (this.endCalled) {
		throw new Error('.end() called more than once');
	}

	this.endCalled = true;
	this.exit();
};

Test.prototype._checkPlanCount = function () {
	if (this.assertError === undefined && this.planCount !== null && this.planCount !== this.assertions.length) {
		var planError = new AvaError('Assertion count of ' + this.assertions.length + ' does not match plan of ' + this.planCount + '.');
		planError.actual = this.assertions.length;
		planError.expected = this.planCount;

		this._setAssertError(planError);
	}
};

Test.prototype.exit = function () {
	var self = this;

	this._checkPlanCount();

	Promise.all(this.assertions)
		.catch(function (err) {
			self._setAssertError(err);
		})
		.finally(function () {
			// calculate total time spent in test
			self.duration = globals.now() - self._timeStart;

			// stop infinite timer
			globals.clearTimeout(self._timeout);

			self._checkPlanCount();

			if (self.assertError !== undefined) {
				self.promise.reject(self.assertError);
				return;
			}

			self.promise.resolve(self);
		});
};

Test.prototype._publicApi = function () {
	return new PublicApi(this);
};

function PublicApi(test) {
	this._test = test;
	this.plan = test.plan.bind(test);
	this.skip = new SkipApi(test);
}

function onAssertionEvent(event) {
	var promise;
	if (event.assertionThrew) {
		event.error.powerAssertContext = event.powerAssertContext;
		event.error.originalMessage = event.originalMessage;
		promise = Promise.reject(event.error);
	} else {
		var ret = event.returnValue;
		if (isObservable(ret)) {
			ret = observableToPromise(ret);
		}
		if (isPromise(ret)) {
			ret = ret
				.then(null, function (err) {
					err.originalMessage = event.originalMessage;
					throw err;
				});
		}
		promise = ret;
	}
	this._test._assert(promise);
	return promise;
}

PublicApi.prototype = enhanceAssert({
	assert: assert,
	onSuccess: onAssertionEvent,
	onError: onAssertionEvent
});

// Getters
[
	'assertCount',
	'title',
	'end'
]
	.forEach(function (name) {
		Object.defineProperty(PublicApi.prototype, name, {
			enumerable: false,
			get: function () {
				return this._test[name];
			}
		});
	});

// Get / Set
Object.defineProperty(PublicApi.prototype, 'context', {
	enumerable: true,
	get: function () {
		return this._test.context;
	},
	set: function (context) {
		this._test.context = context;
	}
});

function skipFn() {
	return this._test._assert(Promise.resolve());
}

function SkipApi(test) {
	this._test = test;
}

Object.keys(assert).forEach(function (el) {
	SkipApi.prototype[el] = skipFn;
});
