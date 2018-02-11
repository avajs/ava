'use strict';
const isGeneratorFn = require('is-generator-fn');
const co = require('co-with-promise');
const concordance = require('concordance');
const observableToPromise = require('observable-to-promise');
const isPromise = require('is-promise');
const isObservable = require('is-observable');
const plur = require('plur');
const assert = require('./assert');
const nowAndTimers = require('./now-and-timers');
const concordanceOptions = require('./concordance-options').default;

function formatErrorValue(label, error) {
	const formatted = concordance.format(error, concordanceOptions);
	return {label, formatted};
}

const captureStack = start => {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = 1;
	const obj = {};
	Error.captureStackTrace(obj, start);
	Error.stackTraceLimit = limitBefore;
	return obj.stack;
};

const assertions = assert.wrapAssertions({
	pass(test) {
		test.countPassedAssertion();
	},

	pending(test, promise) {
		test.addPendingAssertion(promise);
	},

	fail(test, error) {
		test.addFailedAssertion(error);
	}
});
const assertionNames = Object.keys(assertions);

function log() {
	const args = Array.from(arguments, value => {
		return typeof value === 'string' ?
			value :
			concordance.format(value, concordanceOptions);
	});

	if (args.length > 0) {
		this.addLog(args.join(' '));
	}
}

function plan(count) {
	this.plan(count, captureStack(this.plan));
}

const testMap = new WeakMap();
class ExecutionContext {
	constructor(test) {
		testMap.set(this, test);

		const skip = () => {
			test.countPassedAssertion();
		};
		const boundPlan = plan.bind(test);
		boundPlan.skip = () => {};

		Object.defineProperties(this, assertionNames.reduce((props, name) => {
			props[name] = {value: assertions[name].bind(test)};
			props[name].value.skip = skip;
			return props;
		}, {
			log: {value: log.bind(test)},
			plan: {value: boundPlan}
		}));

		this.snapshot.skip = () => {
			test.skipSnapshot();
		};
	}

	get end() {
		const end = testMap.get(this).bindEndCallback();
		const endFn = err => end(err, captureStack(endFn));
		return endFn;
	}

	get title() {
		return testMap.get(this).title;
	}

	get context() {
		return testMap.get(this).contextRef.get();
	}

	set context(context) {
		testMap.get(this).contextRef.set(context);
	}

	_throwsArgStart(assertion, file, line) {
		testMap.get(this).trackThrows({assertion, file, line});
	}

	_throwsArgEnd() {
		testMap.get(this).trackThrows(null);
	}
}

class Test {
	constructor(options) {
		this.contextRef = options.contextRef;
		this.failWithoutAssertions = options.failWithoutAssertions;
		this.fn = isGeneratorFn(options.fn) ? co.wrap(options.fn) : options.fn;
		this.metadata = options.metadata;
		this.title = options.title;
		this.logs = [];

		this.snapshotInvocationCount = 0;
		this.compareWithSnapshot = assertionOptions => {
			const belongsTo = assertionOptions.id || this.title;
			const expected = assertionOptions.expected;
			const index = assertionOptions.id ? 0 : this.snapshotInvocationCount++;
			const label = assertionOptions.id ? '' : assertionOptions.message || `Snapshot ${this.snapshotInvocationCount}`;
			return options.compareTestSnapshot({belongsTo, expected, index, label});
		};
		this.skipSnapshot = () => {
			if (options.updateSnapshots) {
				this.addFailedAssertion(new Error('Snapshot assertions cannot be skipped when updating snapshots'));
			} else {
				this.snapshotInvocationCount++;
				this.countPassedAssertion();
			}
		};

		this.assertCount = 0;
		this.assertError = undefined;
		this.calledEnd = false;
		this.duration = null;
		this.endCallbackFinisher = null;
		this.finishDueToAttributedError = null;
		this.finishDueToInactivity = null;
		this.finishing = false;
		this.pendingAssertionCount = 0;
		this.pendingThrowsAssertion = null;
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
				values: [formatErrorValue('Callback called with an error:', err)]
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
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion passed, but test has already finished'));
		}

		this.assertCount++;
	}

	addLog(text) {
		this.logs.push(text);
	}

	addPendingAssertion(promise) {
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion passed, but test has already finished'));
		}

		this.assertCount++;
		this.pendingAssertionCount++;
		promise
			.catch(err => this.saveFirstError(err))
			.then(() => this.pendingAssertionCount--);
	}

	addFailedAssertion(error) {
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion failed, but test has already finished'));
		}

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

	verifyAssertions() {
		if (!this.assertError) {
			if (this.failWithoutAssertions && !this.calledEnd && this.planCount === null && this.assertCount === 0) {
				this.saveFirstError(new Error('Test finished without running any assertions'));
			} else if (this.pendingAssertionCount > 0) {
				this.saveFirstError(new Error('Test finished, but an assertion is still pending'));
			}
		}
	}

	trackThrows(pending) {
		this.pendingThrowsAssertion = pending;
	}

	detectImproperThrows(err) {
		if (!this.pendingThrowsAssertion) {
			return false;
		}

		const pending = this.pendingThrowsAssertion;
		this.pendingThrowsAssertion = null;

		const values = [];
		if (err) {
			values.push(formatErrorValue(`The following error was thrown, possibly before \`t.${pending.assertion}()\` could be called:`, err));
		}

		this.saveFirstError(new assert.AssertionError({
			assertion: pending.assertion,
			fixedSource: {file: pending.file, line: pending.line},
			improperUsage: true,
			message: `Improper usage of \`t.${pending.assertion}()\` detected`,
			stack: err instanceof Error && err.stack,
			values
		}));
		return true;
	}

	waitForPendingThrowsAssertion() {
		return new Promise(resolve => {
			this.finishDueToAttributedError = () => {
				resolve(this.finishPromised());
			};

			this.finishDueToInactivity = () => {
				this.detectImproperThrows();
				resolve(this.finishPromised());
			};

			// Wait up to a second to see if an error can be attributed to the
			// pending assertion.
			nowAndTimers.setTimeout(() => this.finishDueToInactivity(), 1000).unref();
		});
	}

	attributeLeakedError(err) {
		if (!this.detectImproperThrows(err)) {
			return false;
		}

		this.finishDueToAttributedError();
		return true;
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
		this.startedAt = nowAndTimers.now();

		const result = this.callFn();
		if (!result.ok) {
			if (!this.detectImproperThrows(result.error)) {
				this.saveFirstError(new assert.AssertionError({
					message: 'Error thrown in test',
					stack: result.error instanceof Error && result.error.stack,
					values: [formatErrorValue('Error thrown in test:', result.error)]
				}));
			}
			return this.finishPromised();
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
				return this.finishPromised();
			}

			if (this.calledEnd) {
				return this.finishPromised();
			}

			return new Promise(resolve => {
				this.endCallbackFinisher = () => {
					resolve(this.finishPromised());
				};

				this.finishDueToAttributedError = () => {
					resolve(this.finishPromised());
				};

				this.finishDueToInactivity = () => {
					this.saveFirstError(new Error('`t.end()` was never called'));
					resolve(this.finishPromised());
				};
			});
		}

		if (promise) {
			return new Promise(resolve => {
				this.finishDueToAttributedError = () => {
					resolve(this.finishPromised());
				};

				this.finishDueToInactivity = () => {
					const err = returnedObservable ?
						new Error('Observable returned by test never completed') :
						new Error('Promise returned by test never resolved');
					this.saveFirstError(err);
					resolve(this.finishPromised());
				};

				promise
					.catch(err => {
						if (!this.detectImproperThrows(err)) {
							this.saveFirstError(new assert.AssertionError({
								message: 'Rejected promise returned by test',
								stack: err instanceof Error && err.stack,
								values: [formatErrorValue('Rejected promise returned by test. Reason:', err)]
							}));
						}
					})
					.then(() => resolve(this.finishPromised()));
			});
		}

		return this.finishPromised();
	}

	finish() {
		this.finishing = true;

		if (!this.assertError && this.pendingThrowsAssertion) {
			return this.waitForPendingThrowsAssertion();
		}

		this.verifyPlan();
		this.verifyAssertions();

		this.duration = nowAndTimers.now() - this.startedAt;

		let error = this.assertError;
		let passed = !error;

		if (this.metadata.failing) {
			passed = !passed;

			if (passed) {
				error = null;
			} else {
				error = new Error('Test was expected to fail, but succeeded, you should stop marking the test as failing');
			}
		}

		return {
			duration: this.duration,
			error,
			logs: this.logs,
			metadata: this.metadata,
			passed,
			title: this.title
		};
	}

	finishPromised() {
		return new Promise(resolve => {
			resolve(this.finish());
		});
	}
}

module.exports = Test;
