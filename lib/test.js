'use strict';
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
const globals = require('./globals');
const throwsHelper = require('./throws-helper');

class SkipApi {
	constructor(test) {
		this._test = test;
	}
}

const captureStack = start => {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = 1;
	const obj = {};
	Error.captureStackTrace(obj, start);
	Error.stackTraceLimit = limitBefore;
	return obj.stack;
};

class ExecutionContext {
	constructor(test) {
		this._test = test;
		this.skip = new SkipApi(test);
	}
	plan(ct) {
		this._test.plan(ct, captureStack(this.plan));
	}
	get end() {
		const end = this._test.end;
		const endFn = err => end(err, captureStack(endFn));
		return endFn;
	}
	get title() {
		return this._test.title;
	}
	get context() {
		const contextRef = this._test.contextRef;
		return contextRef && contextRef.context;
	}
	set context(context) {
		const contextRef = this._test.contextRef;

		if (!contextRef) {
			this._test._setAssertError(new Error(`t.context is not available in ${this._test.metadata.type} tests`));
			return;
		}

		contextRef.context = context;
	}
}
Object.defineProperty(ExecutionContext.prototype, 'context', {enumerable: true});

{
	const assertions = assert.wrapAssertions({
		pass(executionContext) {
			executionContext._test._assertionPassed();
		},

		pending(executionContext, promise) {
			executionContext._test._assertionPending(promise);
		},

		fail(executionContext, error) {
			executionContext._test._assertionFailed(error);
		}
	});
	Object.assign(ExecutionContext.prototype, assertions);

	function skipFn() {
		this._test._assertionPassed();
	}
	Object.keys(assertions).forEach(el => {
		SkipApi.prototype[el] = skipFn;
	});
}

class Test {
	constructor(title, fn, contextRef, report) {
		if (typeof title === 'function') {
			contextRef = fn;
			fn = title;
			title = null;
		}

		if (typeof fn !== 'function') {
			throw new Error('You must provide a callback');
		}

		this.title = title || fnName(fn) || '[anonymous]';
		this.fn = isGeneratorFn(fn) ? co.wrap(fn) : fn;
		this.pendingAssertions = [];
		this.assertCount = 0;
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
	_assertionPassed() {
		this.assertCount++;
	}
	_assertionPending(promise) {
		this.sync = false;
		this.assertCount++;
		this.pendingAssertions.push(promise);
	}
	_assertionFailed(error) {
		this._setAssertError(error);
		this.assertCount++;
	}
	_setAssertError(err) {
		if (this.assertError !== undefined) {
			return;
		}

		this.assertError = err;
	}
	plan(count, planStack) {
		if (typeof count !== 'number') {
			throw new TypeError('Expected a number');
		}

		this.planCount = count;

		// In case the `planCount` doesn't match `assertCount,
		// we need the stack of this function to throw with a useful stack
		this.planStack = planStack;
	}
	_run() {
		let ret;

		try {
			ret = this.fn(this._createExecutionContext());
		} catch (err) {
			this.threwSync = true;
			throwsHelper(err);

			let error = err;
			if (!(err instanceof assert.AssertionError)) {
				error = new assert.AssertionError({
					actual: err,
					message: `Error thrown in test`,
					stack: err instanceof Error && err.stack
				});
			}
			this._setAssertError(error);
		}

		return ret;
	}
	promise() {
		if (!this._promise) {
			this._promise = {};

			this._promise.promise = new Promise((resolve, reject) => {
				this._promise.resolve = resolve;
				this._promise.reject = reject;
			}).tap(result => {
				if (this.report) {
					this.report(result);
				}
			});
		}

		return this._promise;
	}
	run() {
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

			// Convert to a Bluebird promise
			return Promise.resolve(ret).then(
				() => this.exit(),
				err => {
					throwsHelper(err);

					if (!(err instanceof assert.AssertionError)) {
						err = new assert.AssertionError({
							actual: err,
							message: 'Rejected promise returned by test',
							stack: err instanceof Error && err.stack
						});
					}

					this._setAssertError(err);
					return this.exit();
				}
			);
		}

		if (this.metadata.callback && !this.threwSync) {
			return this.promise().promise;
		}

		return this.exit();
	}
	_result() {
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
	}
	get end() {
		if (this.metadata.callback) {
			return this._end.bind(this);
		}

		throw new Error('t.end is not supported in this context. To use t.end as a callback, you must use "callback mode" via `test.cb(testName, fn)`');
	}
	_end(err, stack) {
		if (err) {
			if (!(err instanceof assert.AssertionError)) {
				err = new assert.AssertionError({
					actual: err,
					message: 'Callback called with an error',
					stack
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
	}
	_checkPlanCount() {
		if (this.assertError === undefined && this.planCount !== null && this.planCount !== this.assertCount) {
			this._setAssertError(new assert.AssertionError({
				actual: this.assertCount,
				assertion: 'plan',
				expected: this.planCount,
				message: `Planned for ${this.planCount} ${plur('assertion', this.planCount)}, but got ${this.assertCount}.`,
				operator: '===',
				stack: this.planStack
			}));
		}
	}
	exit() {
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

		Promise.all(this.pendingAssertions)
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
	}
	_createExecutionContext() {
		return new ExecutionContext(this);
	}
}

module.exports = Test;
