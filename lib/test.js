'use strict';
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

function log(...inputArgs) {
	const args = inputArgs.map(value => {
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

function timeout(ms) {
	this.timeout(ms);
}

function tryTest(...args) {
	// Few lines dealing with title/macro are taken from runner.js
	const specifiedTitle = typeof args[0] === 'string' ?
		args.shift() :
		undefined;
	// Used to make sure we return single object for single implementation function passed.
	const singleImplementation = !Array.isArray(args[0]);
	const implementations = singleImplementation ?
		args.splice(0, 1) :
		args.shift();

	if (implementations.length === 0) {
		throw new TypeError('Expected an implementation.');
	}

	const attemptPromises = implementations.map(implementation => {
		const title = implementation.title ?
			implementation.title(specifiedTitle, ...args) :
			specifiedTitle;

		let committed = false;
		let discarded = false;

		this.addPendingAttemptAssertion();

		const attemptTest = this.forAttempt(title, t => implementation(t, ...args));

		return attemptTest.run().then(ret => {
			const {passed, error, title, logs} = ret;
			const errors = error ? [error] : [];

			return {
				passed,
				errors,
				title,
				logs,
				commit: ({retainLogs = true} = {}) => {
					if (committed) {
						return;
					}

					if (discarded) {
						this.saveFirstError(new Error('Can\'t commit a result that was previously discarded'));
						return;
					}

					committed = true;
					this.countAttemptAssertion({
						inc: attemptTest.assertCount,
						commit: true,
						result: ret,
						retainLogs
					});
				},
				discard: ({retainLogs = false} = {}) => {
					if (committed) {
						this.saveFirstError(new Error('Can\'t discard a result that was previously committed'));
						return;
					}

					if (discarded) {
						return;
					}

					discarded = true;
					this.countAttemptAssertion({
						inc: 0,
						commit: false,
						result: ret,
						retainLogs
					});
				}
			};
		});
	});

	return Promise.all(attemptPromises)
		.then(results => singleImplementation ? results[0] : results);
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

		const boundTryTest = tryTest.bind(test);
		boundTryTest.skip = skip;

		Object.defineProperties(this, assertionNames.reduce((props, name) => {
			props[name] = {value: assertions[name].bind(test)};
			props[name].value.skip = skip;
			return props;
		}, {
			log: {value: log.bind(test)},
			plan: {value: boundPlan},
			timeout: {value: timeout.bind(test)},
			try: {value: boundTryTest}
		}));

		this.snapshot.skip = () => {
			test.skipSnapshot();
		};
	}

	get end() {
		const end = testMap.get(this).bindEndCallback();
		const endFn = error => end(error, captureStack(endFn));
		return endFn;
	}

	get title() {
		return testMap.get(this).title;
	}

	get context() {
		const test = testMap.get(this);
		return test.metadata.inline ? undefined : test.contextRef.get();
	}

	set context(context) {
		const test = testMap.get(this);
		if (!test.metadata.inline) {
			test.contextRef.set(context);
		}
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
		this.fn = options.fn;
		this.metadata = options.metadata;
		this.title = options.title;
		this.logs = [];

		this.snapshotInvocationCount = 0;
		this.compareWithSnapshot = assertionOptions => {
			const belongsTo = assertionOptions.id || this.title;
			const {expected} = assertionOptions;
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
		this.finishDueToTimeout = null;
		this.finishing = false;
		this.pendingAssertionCount = 0;
		this.pendingThrowsAssertion = null;
		this.planCount = null;
		this.startedAt = 0;
		this.timeoutTimer = null;
		this.timeoutMs = 0;
		this.pendingAttemptCount = 0;
		this.attemptCount = 0;

		this.forAttempt = (title, fn) => {
			const attemptId = this.attemptCount++;
			title = title || (this.title + '.A' + attemptId);

			const opts = Object.assign({}, options, {
				metadata: Object.assign({}, options.metadata, {inline: true}),
				fn,
				title
			});
			return new Test(opts);
		};
	}

	bindEndCallback() {
		if (!this.metadata.inline && this.metadata.callback) {
			return (error, stack) => {
				this.endCallback(error, stack);
			};
		}

		if (this.metadata.inline) {
			throw new Error('`t.end()` is not supported in this context. You have to return promise for asynchronous attempt.');
		} else {
			throw new Error('`t.end()` is not supported in this context. To use `t.end()` as a callback, you must use "callback mode" via `test.cb(testName, fn)`');
		}
	}

	endCallback(error, stack) {
		if (this.calledEnd) {
			this.saveFirstError(new Error('`t.end()` called more than once'));
			return;
		}

		this.calledEnd = true;

		if (error) {
			this.saveFirstError(new assert.AssertionError({
				actual: error,
				message: 'Callback called with an error',
				stack,
				values: [formatErrorValue('Callback called with an error:', error)]
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
		this.refreshTimeout();
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
		this.refreshTimeout();

		promise
			.catch(error => this.saveFirstError(error))
			.then(() => {
				this.pendingAssertionCount--;
				this.refreshTimeout();
			});
	}

	addFailedAssertion(error) {
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion failed, but test has already finished'));
		}

		this.assertCount++;
		this.refreshTimeout();
		this.saveFirstError(error);
	}

	addPendingAttemptAssertion() {
		if (this.finishing) {
			this.saveFirstError(new Error('Adding the attempt, but the test has already finished'));
		}

		this.pendingAttemptCount++;
	}

	countAttemptAssertion({inc, commit, result: {passed, error, logs}, retainLogs}) {
		if (this.finishing) {
			this.saveFirstError(new Error('Attempt is complete, but the test has already finished'));
		}

		this.assertCount += inc;
		this.pendingAttemptCount--;

		if (commit && !passed) {
			this.saveFirstError(error);
		}

		if (retainLogs) {
			for (const log of logs) {
				this.addLog(log);
			}
		}

		this.refreshTimeout();
	}

	saveFirstError(error) {
		if (!this.assertError) {
			this.assertError = error;
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

	timeout(ms) {
		if (this.finishing) {
			return;
		}

		this.clearTimeout();
		this.timeoutMs = ms;
		this.timeoutTimer = nowAndTimers.setTimeout(() => {
			this.saveFirstError(new Error('Test timeout exceeded'));

			if (this.finishDueToTimeout) {
				this.finishDueToTimeout();
			}
		}, ms);
	}

	refreshTimeout() {
		if (!this.timeoutTimer) {
			return;
		}

		if (this.timeoutTimer.refresh) {
			this.timeoutTimer.refresh();
		} else {
			this.timeout(this.timeoutMs);
		}
	}

	clearTimeout() {
		clearTimeout(this.timeoutTimer);
		this.timeoutTimer = null;
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
			if (this.failWithoutAssertions && !this.calledEnd && this.planCount === null && this.pendingAttemptCount > 0) {
				this.saveFirstError(new Error('Test finished, but not all attempts were committed or discarded'));
			} else if (this.failWithoutAssertions && !this.calledEnd && this.planCount === null && this.assertCount === 0) {
				this.saveFirstError(new Error('Test finished without running any assertions'));
			} else if (this.pendingAssertionCount > 0) {
				this.saveFirstError(new Error('Test finished, but an assertion is still pending'));
			}
		}
	}

	trackThrows(pending) {
		this.pendingThrowsAssertion = pending;
	}

	detectImproperThrows(error) {
		if (!this.pendingThrowsAssertion) {
			return false;
		}

		const pending = this.pendingThrowsAssertion;
		this.pendingThrowsAssertion = null;

		const values = [];
		if (error) {
			values.push(formatErrorValue(`The following error was thrown, possibly before \`t.${pending.assertion}()\` could be called:`, error));
		}

		this.saveFirstError(new assert.AssertionError({
			assertion: pending.assertion,
			fixedSource: {file: pending.file, line: pending.line},
			improperUsage: true,
			message: `Improper usage of \`t.${pending.assertion}()\` detected`,
			stack: error instanceof Error && error.stack,
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

	attributeLeakedError(error) {
		if (!this.detectImproperThrows(error)) {
			return false;
		}

		this.finishDueToAttributedError();
		return true;
	}

	callFn() {
		try {
			return {
				ok: true,
				retval: this.fn.call(null, this.createExecutionContext())
			};
		} catch (error) {
			return {
				ok: false,
				error
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

		if (!this.metadata.inline && this.metadata.callback) {
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

				this.finishDueToTimeout = () => {
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

				this.finishDueToTimeout = () => {
					resolve(this.finishPromised());
				};

				this.finishDueToInactivity = () => {
					const error = returnedObservable ?
						new Error('Observable returned by test never completed') :
						new Error('Promise returned by test never resolved');
					this.saveFirstError(error);
					resolve(this.finishPromised());
				};

				promise
					.catch(error => {
						if (!this.detectImproperThrows(error)) {
							this.saveFirstError(new assert.AssertionError({
								message: 'Rejected promise returned by test',
								stack: error instanceof Error && error.stack,
								values: [formatErrorValue('Rejected promise returned by test. Reason:', error)]
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

		this.clearTimeout();
		this.verifyPlan();
		this.verifyAssertions();

		this.duration = nowAndTimers.now() - this.startedAt;

		let error = this.assertError;
		let passed = !error;

		if (!this.metadata.inline && this.metadata.failing) {
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
