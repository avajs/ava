'use strict';
const isGeneratorFn = require('is-generator-fn');
const maxTimeout = require('max-timeout');
const co = require('co-with-promise');
const observableToPromise = require('observable-to-promise');
const isPromise = require('is-promise');
const isObservable = require('is-observable');
const plur = require('plur');
const assert = require('./assert');
const formatAssertError = require('./format-assert-error');
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
		const end = this._test.bindEndCallback();
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
			this._test.saveFirstError(new Error(`\`t.context\` is not available in ${this._test.metadata.type} tests`));
			return;
		}

		contextRef.context = context;
	}
}
Object.defineProperty(ExecutionContext.prototype, 'context', {enumerable: true});

{
	const assertions = assert.wrapAssertions({
		pass(executionContext) {
			executionContext._test.countPassedAssertion();
		},

		pending(executionContext, promise) {
			executionContext._test.addPendingAssertion(promise);
		},

		fail(executionContext, error) {
			executionContext._test.addFailedAssertion(error);
		}
	});
	Object.assign(ExecutionContext.prototype, assertions);

	function skipFn() {
		this._test.countPassedAssertion();
	}
	Object.keys(assertions).forEach(el => {
		SkipApi.prototype[el] = skipFn;
	});
}

class Test {
	constructor(metadata, title, fn, contextRef, onResult) { // eslint-disable-line max-params
		this.metadata = metadata;
		this.title = title;
		this.fn = isGeneratorFn(fn) ? co.wrap(fn) : fn;
		this.contextRef = contextRef;
		this.onResult = onResult;

		this.assertCount = 0;
		this.assertError = undefined;
		this.calledEnd = false;
		this.duration = null;
		this.endCallbackFinisher = null;
		this.pendingAssertions = [];
		this.planCount = null;
		this.startedAt = 0;
	}

	bindEndCallback() {
		if (this.metadata.callback) {
			return (err, stack) => {
				this.endCallback(err, stack);
			};
		}

		throw new Error('`t.end()`` is not supported in this context. To use `t.end()` as a callback, you must use "callback mode" via `test.cb(testName, fn)`');
	}

	endCallback(err, stack) {
		if (this.calledEnd) {
			this.saveFirstError(new Error('`t.end()` called more than once'));
			return;
		}
		this.calledEnd = true;

		if (err) {
			this.saveFirstError(new assert.AssertionError({
				actual: err,
				message: 'Callback called with an error',
				stack,
				values: [formatAssertError.formatWithLabel('Error:', err)]
			}));
		}

		if (this.endCallbackFinisher) {
			this.endCallbackFinisher();
		}
	}

	createExecutionContext() {
		return new ExecutionContext(this);
	}

	countPassedAssertion() {
		this.assertCount++;
	}

	addPendingAssertion(promise) {
		this.assertCount++;
		this.pendingAssertions.push(promise);
	}

	addFailedAssertion(error) {
		this.assertCount++;
		this.saveFirstError(error);
	}

	saveFirstError(err) {
		if (!this.assertError) {
			this.assertError = err;
		}
	}

	plan(count, planStack) {
		if (typeof count !== 'number') {
			throw new TypeError('Expected a number');
		}

		this.planCount = count;

		// In case the `planCount` doesn't match `assertCount, we need the stack of
		// this function to throw with a useful stack.
		this.planStack = planStack;
	}

	verifyPlan() {
		if (!this.assertError && this.planCount !== null && this.planCount !== this.assertCount) {
			this.saveFirstError(new assert.AssertionError({
				assertion: 'plan',
				message: `Planned for ${this.planCount} ${plur('assertion', this.planCount)}, but got ${this.assertCount}.`,
				operator: '===',
				stack: this.planStack
			}));
		}
	}

	callFn() {
		try {
			return {
				ok: true,
				retval: this.fn(this.createExecutionContext())
			};
		} catch (err) {
			return {
				ok: false,
				error: err
			};
		}
	}

	run() {
		this.startedAt = globals.now();

		// Wait until all assertions are complete
		this.timeoutHandle = globals.setTimeout(() => {}, maxTimeout);

		const result = this.callFn();
		if (!result.ok) {
			throwsHelper(result.error);

			this.saveFirstError(new assert.AssertionError({
				message: 'Error thrown in test',
				stack: result.error instanceof Error && result.error.stack,
				values: [formatAssertError.formatWithLabel('Error:', result.error)]
			}));
			return this.finish();
		}

		const returnedObservable = isObservable(result.retval);
		const returnedPromise = isPromise(result.retval);

		let promise;
		if (returnedObservable) {
			promise = observableToPromise(result.retval);
		} else if (returnedPromise) {
			// `retval` can be any thenable, so convert to a proper promise.
			promise = Promise.resolve(result.retval);
		}

		if (this.metadata.callback) {
			if (returnedObservable || returnedPromise) {
				const asyncType = returnedObservable ? 'observables' : 'promises';
				this.saveFirstError(new Error(`Do not return ${asyncType} from tests declared via \`test.cb(...)\`, if you want to return a promise simply declare the test via \`test(...)\``));
				return this.finish();
			}

			if (this.calledEnd) {
				return this.finish();
			}

			return new Promise(resolve => {
				this.endCallbackFinisher = () => {
					resolve(this.finishPromised());
				};
			});
		}

		if (promise) {
			return promise.then(
				() => this.finish(),
				err => {
					throwsHelper(err);

					this.saveFirstError(new assert.AssertionError({
						message: 'Rejected promise returned by test',
						stack: err instanceof Error && err.stack,
						values: [formatAssertError.formatWithLabel('Rejection reason:', err)]
					}));
					return this.finish();
				}
			);
		}

		return this.finish();
	}

	finish() {
		if (this.pendingAssertions.length === 0) {
			return this.finishImmediately();
		}

		this.verifyPlan();

		// Consume errors, ensuring there are no unhandled rejections.
		const consumedErrors = Promise.all(this.pendingAssertions)
			.catch(err => this.saveFirstError(err));

		// Don't wait if there is an error.
		if (this.assertError) {
			return this.completeFinish();
		}

		// Finish after potential errors from pending assertions have been consumed.
		// Note that the plan must be verified again in case a new assertion was
		// added.
		return consumedErrors.then(() => this.finishImmediately());
	}

	finishPromised() {
		return new Promise(resolve => {
			resolve(this.finish());
		});
	}

	finishImmediately() {
		this.verifyPlan();
		return this.completeFinish();
	}

	completeFinish() {
		this.duration = globals.now() - this.startedAt;
		globals.clearTimeout(this.timeoutHandle);

		let reason = this.assertError;
		let passed = !reason;

		if (this.metadata.failing) {
			passed = !passed;

			if (passed) {
				reason = undefined;
			} else {
				reason = new Error('Test was expected to fail, but succeeded, you should stop marking the test as failing');
			}
		}

		this.onResult({
			passed,
			result: this,
			reason
		});

		return passed;
	}
}

module.exports = Test;
