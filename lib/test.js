import concordance from 'concordance';
import isPromise from 'is-promise';
import plur from 'plur';

import {AssertionError, Assertions, checkAssertionMessage} from './assert.js';
import concordanceOptions from './concordance-options.js';
import nowAndTimers from './now-and-timers.cjs';
import parseTestArgs from './parse-test-args.js';

const hasOwnProperty = (object, prop) => Object.prototype.hasOwnProperty.call(object, prop);

function isExternalAssertError(error) {
	if (typeof error !== 'object' || error === null) {
		return false;
	}

	// Match errors thrown by <https://www.npmjs.com/package/expect>.
	if (hasOwnProperty(error, 'matcherResult')) {
		return true;
	}

	// Match errors thrown by <https://www.npmjs.com/package/chai> and <https://nodejs.org/api/assert.html>.
	return hasOwnProperty(error, 'actual') && hasOwnProperty(error, 'expected');
}

function formatErrorValue(label, error) {
	const formatted = concordance.format(error, concordanceOptions);
	return {label, formatted};
}

const captureSavedError = () => {
	const limitBefore = Error.stackTraceLimit;
	Error.stackTraceLimit = 1;
	const error = new Error(); // eslint-disable-line unicorn/error-message
	Error.stackTraceLimit = limitBefore;
	return error;
};

const testMap = new WeakMap();
class ExecutionContext extends Assertions {
	constructor(test) {
		super({
			pass() {
				test.countPassedAssertion();
			},
			pending(promise) {
				test.addPendingAssertion(promise);
			},
			fail(error) {
				test.addFailedAssertion(error);
			},
			skip() {
				test.countPassedAssertion();
			},
			compareWithSnapshot: options => test.compareWithSnapshot(options),
			experiments: test.experiments,
			disableSnapshots: test.isHook === true,
		});
		testMap.set(this, test);

		this.snapshot.skip = () => {
			test.skipSnapshot();
		};

		this.log = (...inputArgs) => {
			const args = inputArgs.map(value => typeof value === 'string'
				? value
				: concordance.format(value, concordanceOptions));
			if (args.length > 0) {
				test.addLog(args.join(' '));
			}
		};

		this.plan = count => {
			test.plan(count, captureSavedError());
		};

		this.plan.skip = () => {};

		this.timeout = (ms, message) => {
			test.timeout(ms, message);
		};

		this.teardown = callback => {
			test.addTeardown(callback);
		};

		this.try = async (...attemptArgs) => {
			if (test.isHook) {
				const error = new Error('`t.try()` can only be used in tests');
				test.saveFirstError(error);
				throw error;
			}

			const {args, implementation, title} = parseTestArgs(attemptArgs);

			if (!implementation) {
				throw new TypeError('Expected an implementation.');
			}

			if (Array.isArray(implementation)) {
				throw new TypeError('AVA 4 no longer supports t.try() with multiple implementations.');
			}

			let attemptTitle;
			if (!title.isSet || title.isEmpty) {
				attemptTitle = `${test.title} ─ attempt ${test.attemptCount + 1}`;
			} else if (title.isValid) {
				attemptTitle = `${test.title} ─ ${title.value}`;
			} else {
				throw new TypeError('`t.try()` titles must be strings');
			}

			if (!test.registerUniqueTitle(attemptTitle)) {
				throw new Error(`Duplicate test title: ${attemptTitle}`);
			}

			let committed = false;
			let discarded = false;

			const {assertCount, deferredSnapshotRecordings, errors, logs, passed, snapshotCount, startingSnapshotCount} = await test.runAttempt(attemptTitle, t => implementation(t, ...args));

			return {
				errors,
				logs: [...logs], // Don't allow modification of logs.
				passed,
				title: attemptTitle,
				commit({retainLogs = true} = {}) {
					if (committed) {
						return;
					}

					if (discarded) {
						test.saveFirstError(new Error('Can’t commit a result that was previously discarded'));
						return;
					}

					committed = true;
					test.finishAttempt({
						assertCount,
						commit: true,
						deferredSnapshotRecordings,
						errors,
						logs,
						passed,
						retainLogs,
						snapshotCount,
						startingSnapshotCount,
					});
				},
				discard({retainLogs = false} = {}) {
					if (committed) {
						test.saveFirstError(new Error('Can’t discard a result that was previously committed'));
						return;
					}

					if (discarded) {
						return;
					}

					discarded = true;
					test.finishAttempt({
						assertCount: 0,
						commit: false,
						deferredSnapshotRecordings,
						errors,
						logs,
						passed,
						retainLogs,
						snapshotCount,
						startingSnapshotCount,
					});
				},
			};
		};
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

	get passed() {
		const test = testMap.get(this);
		return test.isHook ? test.testPassed : !test.assertError;
	}
}

export default class Test {
	constructor(options) {
		this.contextRef = options.contextRef;
		this.experiments = options.experiments || {};
		this.failWithoutAssertions = options.failWithoutAssertions;
		this.fn = options.fn;
		this.isHook = options.isHook === true;
		this.metadata = options.metadata;
		this.title = options.title;
		this.testPassed = options.testPassed;
		this.registerUniqueTitle = options.registerUniqueTitle;
		this.logs = [];
		this.teardowns = [];
		this.notifyTimeoutUpdate = options.notifyTimeoutUpdate;

		const {snapshotBelongsTo = this.title, nextSnapshotIndex = 0} = options;
		this.snapshotBelongsTo = snapshotBelongsTo;
		this.nextSnapshotIndex = nextSnapshotIndex;
		this.snapshotCount = 0;

		const deferRecording = this.metadata.inline;
		this.deferredSnapshotRecordings = [];
		this.compareWithSnapshot = ({expected, message}) => {
			this.snapshotCount++;

			const belongsTo = snapshotBelongsTo;
			const index = this.nextSnapshotIndex++;
			const label = message;

			const {record, ...result} = options.compareTestSnapshot({
				belongsTo,
				deferRecording,
				expected,
				index,
				label,
				taskIndex: this.metadata.taskIndex,
			});
			if (record) {
				this.deferredSnapshotRecordings.push(record);
			}

			return result;
		};

		this.skipSnapshot = () => {
			if (typeof options.skipSnapshot === 'function') {
				const record = options.skipSnapshot({
					belongsTo: snapshotBelongsTo,
					index: this.nextSnapshotIndex,
					deferRecording,
					taskIndex: this.metadata.taskIndex,
				});
				if (record) {
					this.deferredSnapshotRecordings.push(record);
				}
			}

			this.nextSnapshotIndex++;
			this.snapshotCount++;
			this.countPassedAssertion();
		};

		this.runAttempt = async (title, fn) => {
			if (this.finishing) {
				this.saveFirstError(new Error('Running a `t.try()`, but the test has already finished'));
			}

			this.attemptCount++;
			this.pendingAttemptCount++;

			const {contextRef, snapshotBelongsTo, nextSnapshotIndex, snapshotCount: startingSnapshotCount} = this;
			const attempt = new Test({
				...options,
				fn,
				metadata: {...options.metadata, failing: false, inline: true},
				contextRef: contextRef.copy(),
				snapshotBelongsTo,
				nextSnapshotIndex,
				title,
			});

			const {deferredSnapshotRecordings, error, logs, passed, assertCount, snapshotCount} = await attempt.run();
			const errors = error ? [error] : [];
			return {assertCount, deferredSnapshotRecordings, errors, logs, passed, snapshotCount, startingSnapshotCount};
		};

		this.assertCount = 0;
		this.assertError = undefined;
		this.attemptCount = 0;
		this.calledEnd = false;
		this.duration = null;
		this.finishDueToInactivity = null;
		this.finishDueToTimeout = null;
		this.finishing = false;
		this.pendingAssertionCount = 0;
		this.pendingAttemptCount = 0;
		this.planCount = null;
		this.startedAt = 0;
		this.timeoutMs = 0;
		this.timeoutTimer = null;
	}

	createExecutionContext() {
		return new ExecutionContext(this);
	}

	countPassedAssertion() {
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion passed, but test has already finished'));
		}

		if (this.pendingAttemptCount > 0) {
			this.saveFirstError(new Error('Assertion passed, but an attempt is pending. Use the attempt’s assertions instead'));
		}

		this.assertCount++;
		this.refreshTimeout();
	}

	addLog(text) {
		this.logs.push(text);
	}

	addPendingAssertion(promise) {
		if (this.finishing) {
			this.saveFirstError(new Error('Assertion started, but test has already finished'));
		}

		if (this.pendingAttemptCount > 0) {
			this.saveFirstError(new Error('Assertion started, but an attempt is pending. Use the attempt’s assertions instead'));
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

		if (this.pendingAttemptCount > 0) {
			this.saveFirstError(new Error('Assertion failed, but an attempt is pending. Use the attempt’s assertions instead'));
		}

		this.assertCount++;
		this.refreshTimeout();
		this.saveFirstError(error);
	}

	finishAttempt({commit, deferredSnapshotRecordings, errors, logs, passed, retainLogs, snapshotCount, startingSnapshotCount}) {
		if (this.finishing) {
			if (commit) {
				this.saveFirstError(new Error('`t.try()` result was committed, but the test has already finished'));
			} else {
				this.saveFirstError(new Error('`t.try()` result was discarded, but the test has already finished'));
			}
		}

		if (commit) {
			this.assertCount++;

			if (startingSnapshotCount === this.snapshotCount) {
				this.snapshotCount += snapshotCount;
				this.nextSnapshotIndex += snapshotCount;
				for (const record of deferredSnapshotRecordings) {
					record();
				}
			} else {
				this.saveFirstError(new Error('Cannot commit `t.try()` result. Do not run concurrent snapshot assertions when using `t.try()`'));
			}
		}

		this.pendingAttemptCount--;

		if (commit && !passed) {
			this.saveFirstError(errors[0]);
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

	plan(count, planError) {
		if (typeof count !== 'number') {
			throw new TypeError('Expected a number');
		}

		this.planCount = count;

		// In case the `planCount` doesn't match `assertCount, we need the stack of
		// this function to throw with a useful stack.
		this.planError = planError;
	}

	timeout(ms, message) {
		const result = checkAssertionMessage('timeout', message);
		if (result !== true) {
			this.saveFirstError(result);
			// Allow the timeout to be set even when the message is invalid.
			message = '';
		}

		if (this.finishing) {
			return;
		}

		this.clearTimeout();
		this.timeoutMs = ms;
		this.timeoutTimer = nowAndTimers.setCappedTimeout(() => {
			this.saveFirstError(new Error(message || 'Test timeout exceeded'));

			if (this.finishDueToTimeout) {
				this.finishDueToTimeout();
			}
		}, ms);

		this.notifyTimeoutUpdate(this.timeoutMs);
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
		nowAndTimers.clearTimeout(this.timeoutTimer);
		this.timeoutTimer = null;
	}

	addTeardown(callback) {
		if (this.isHook) {
			this.saveFirstError(new Error('`t.teardown()` is not allowed in hooks'));
			return;
		}

		if (this.finishing) {
			this.saveFirstError(new Error('`t.teardown()` cannot be used during teardown'));
			return;
		}

		if (typeof callback !== 'function') {
			throw new TypeError('Expected a function');
		}

		this.teardowns.push(callback);
	}

	async runTeardowns() {
		const teardowns = [...this.teardowns].reverse();

		for (const teardown of teardowns) {
			try {
				await teardown(); // eslint-disable-line no-await-in-loop
			} catch (error) {
				this.saveFirstError(error);
			}
		}
	}

	verifyPlan() {
		if (!this.assertError && this.planCount !== null && this.planCount !== this.assertCount) {
			this.saveFirstError(new AssertionError({
				assertion: 'plan',
				message: `Planned for ${this.planCount} ${plur('assertion', this.planCount)}, but got ${this.assertCount}.`,
				operator: '===',
				savedError: this.planError,
			}));
		}
	}

	verifyAssertions() {
		if (this.assertError) {
			return;
		}

		if (this.pendingAttemptCount > 0) {
			this.saveFirstError(new Error('Test finished, but not all attempts were committed or discarded'));
			return;
		}

		if (this.pendingAssertionCount > 0) {
			this.saveFirstError(new Error('Test finished, but an assertion is still pending'));
			return;
		}

		if (this.failWithoutAssertions) {
			if (this.planCount !== null) {
				return; // `verifyPlan()` will report an error already.
			}

			if (this.assertCount === 0 && !this.calledEnd) {
				this.saveFirstError(new Error('Test finished without running any assertions'));
			}
		}
	}

	callFn() {
		try {
			return {
				ok: true,
				retval: this.fn.call(null, this.createExecutionContext()),
			};
		} catch (error) {
			return {
				ok: false,
				error,
			};
		}
	}

	run() {
		this.startedAt = nowAndTimers.now();

		const result = this.callFn();
		if (!result.ok) {
			if (isExternalAssertError(result.error)) {
				this.saveFirstError(new AssertionError({
					message: 'Assertion failed',
					savedError: result.error instanceof Error && result.error,
					values: [{label: 'Assertion failed: ', formatted: result.error.message}],
				}));
			} else {
				this.saveFirstError(new AssertionError({
					message: 'Error thrown in test',
					savedError: result.error instanceof Error && result.error,
					values: [formatErrorValue('Error thrown in test:', result.error)],
				}));
			}

			return this.finish();
		}

		const returnedObservable = result.retval !== null && typeof result.retval === 'object' && typeof result.retval.subscribe === 'function';
		const returnedPromise = isPromise(result.retval);

		let promise;
		if (returnedObservable) {
			promise = new Promise((resolve, reject) => {
				result.retval.subscribe({
					error: reject,
					complete: () => resolve(),
				});
			});
		} else if (returnedPromise) {
			// `retval` can be any thenable, so convert to a proper promise.
			promise = Promise.resolve(result.retval);
		}

		if (promise) {
			return new Promise(resolve => {
				this.finishDueToAttributedError = () => {
					resolve(this.finish());
				};

				this.finishDueToTimeout = () => {
					resolve(this.finish());
				};

				this.finishDueToInactivity = () => {
					const error = returnedObservable
						? new Error('Observable returned by test never completed')
						: new Error('Promise returned by test never resolved');
					this.saveFirstError(error);
					resolve(this.finish());
				};

				promise
					.catch(error => {
						if (isExternalAssertError(error)) {
							this.saveFirstError(new AssertionError({
								message: 'Assertion failed',
								savedError: error instanceof Error && error,
								values: [{label: 'Assertion failed: ', formatted: error.message}],
							}));
						} else {
							this.saveFirstError(new AssertionError({
								message: 'Rejected promise returned by test',
								savedError: error instanceof Error && error,
								values: [formatErrorValue('Rejected promise returned by test. Reason:', error)],
							}));
						}
					})
					.then(() => resolve(this.finish()));
			});
		}

		return this.finish();
	}

	async finish() {
		this.finishing = true;

		this.clearTimeout();
		this.verifyPlan();
		this.verifyAssertions();
		await this.runTeardowns();

		this.duration = nowAndTimers.now() - this.startedAt;

		let error = this.assertError;
		let passed = !error;

		if (this.metadata.failing) {
			passed = !passed;

			error = passed ? null : new Error('Test was expected to fail, but succeeded, you should stop marking the test as failing');
		}

		return {
			deferredSnapshotRecordings: this.deferredSnapshotRecordings,
			duration: this.duration,
			error,
			logs: this.logs,
			metadata: this.metadata,
			passed,
			snapshotCount: this.snapshotCount,
			assertCount: this.assertCount,
			title: this.title,
		};
	}
}
