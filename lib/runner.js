'use strict';
const EventEmitter = require('events');
const path = require('path');
const matcher = require('matcher');
const ContextRef = require('./context-ref');
const createChain = require('./create-chain');
const snapshotManager = require('./snapshot-manager');
const Runnable = require('./test');

class Runner extends EventEmitter {
	constructor(options) {
		super();

		options = options || {};
		this.failFast = options.failFast === true;
		this.failWithoutAssertions = options.failWithoutAssertions !== false;
		this.file = options.file;
		this.match = options.match || [];
		this.projectDir = options.projectDir;
		this.runOnlyExclusive = options.runOnlyExclusive === true;
		this.serial = options.serial === true;
		this.snapshotDir = options.snapshotDir;
		this.updateSnapshots = options.updateSnapshots;

		this.activeRunnables = new Set();
		this.boundCompareTestSnapshot = this.compareTestSnapshot.bind(this);
		this.interrupted = false;
		this.snapshots = null;
		this.stats = {
			failCount: 0,
			failedHookCount: 0,
			hasExclusive: false,
			knownFailureCount: 0,
			passCount: 0,
			skipCount: 0,
			testCount: 0,
			todoCount: 0
		};
		this.tasks = {
			after: [],
			afterAlways: [],
			afterEach: [],
			afterEachAlways: [],
			before: [],
			beforeEach: [],
			concurrent: [],
			serial: [],
			todo: []
		};

		const uniqueTestTitles = new Set();
		let hasStarted = false;
		let scheduledStart = false;
		this.chain = createChain((metadata, args) => { // eslint-disable-line complexity
			if (hasStarted) {
				throw new Error('All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.');
			}
			if (!scheduledStart) {
				scheduledStart = true;
				process.nextTick(() => {
					hasStarted = true;
					this.start();
				});
			}

			const specifiedTitle = typeof args[0] === 'string' ?
				args.shift() :
				'';
			const implementations = Array.isArray(args[0]) ?
				args.shift() :
				args.splice(0, 1);

			if (metadata.todo) {
				if (implementations.length > 0) {
					throw new TypeError('`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.');
				}

				if (specifiedTitle === '') {
					throw new TypeError('`todo` tests require a title');
				}

				if (uniqueTestTitles.has(specifiedTitle)) {
					throw new Error(`Duplicate test title: ${specifiedTitle}`);
				} else {
					uniqueTestTitles.add(specifiedTitle);
				}

				if (this.match.length > 0) {
					// --match selects TODO tests.
					if (matcher([specifiedTitle], this.match).length === 1) {
						metadata.exclusive = true;
						this.stats.hasExclusive = true;
					}
				}

				this.tasks.todo.push({title: specifiedTitle, metadata});
			} else {
				if (implementations.length === 0) {
					throw new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.');
				}

				for (const implementation of implementations) {
					let title = implementation.title ?
						implementation.title.apply(implementation, [specifiedTitle].concat(args)) :
						specifiedTitle;

					if (typeof title !== 'string') {
						throw new TypeError('Test & hook titles must be strings');
					}

					if (title === '') {
						if (metadata.type === 'test') {
							throw new TypeError('Tests must have a title');
						} else if (metadata.always) {
							title = `${metadata.type}.always hook`;
						} else {
							title = `${metadata.type} hook`;
						}
					}

					if (metadata.type === 'test') {
						if (uniqueTestTitles.has(title)) {
							throw new Error(`Duplicate test title: ${title}`);
						} else {
							uniqueTestTitles.add(title);
						}
					}

					const task = {
						title,
						implementation,
						args,
						metadata: Object.assign({}, metadata)
					};

					if (metadata.type === 'test') {
						if (this.match.length > 0) {
							// --match overrides .only()
							task.metadata.exclusive = matcher([title], this.match).length === 1;
						}
						if (task.metadata.exclusive) {
							this.stats.hasExclusive = true;
						}

						this.tasks[metadata.serial ? 'serial' : 'concurrent'].push(task);
					} else if (!metadata.skipped) {
						this.tasks[metadata.type + (metadata.always ? 'Always' : '')].push(task);
					}
				}
			}
		}, {
			serial: false,
			exclusive: false,
			skipped: false,
			todo: false,
			failing: false,
			callback: false,
			always: false
		});
	}

	compareTestSnapshot(options) {
		if (!this.snapshots) {
			this.snapshots = snapshotManager.load({
				file: this.file,
				fixedLocation: this.snapshotDir,
				name: path.basename(this.file),
				projectDir: this.projectDir,
				relFile: path.relative(this.projectDir, this.file),
				testDir: path.dirname(this.file),
				updating: this.updateSnapshots
			});
			this.emit('dependency', this.snapshots.snapPath);
		}

		return this.snapshots.compare(options);
	}

	saveSnapshotState() {
		if (this.snapshots) {
			const files = this.snapshots.save();
			if (files) {
				this.emit('touched', files);
			}
		} else if (this.updateSnapshots) {
			// TODO: There may be unused snapshot files if no test caused the
			// snapshots to be loaded. Prune them. But not if tests (including hooks!)
			// were skipped. Perhaps emit a warning if this occurs?
		}
	}

	onRun(runnable) {
		this.activeRunnables.add(runnable);
	}

	onRunComplete(runnable) {
		this.activeRunnables.delete(runnable);
	}

	attributeLeakedError(err) {
		for (const runnable of this.activeRunnables) {
			if (runnable.attributeLeakedError(err)) {
				return true;
			}
		}
		return false;
	}

	beforeExitHandler() {
		for (const runnable of this.activeRunnables) {
			runnable.finishDueToInactivity();
		}
	}

	runMultiple(runnables) {
		let allPassed = true;
		const storedResults = [];
		const runAndStoreResult = runnable => {
			return this.runSingle(runnable).then(result => {
				if (!result.passed) {
					allPassed = false;
				}
				storedResults.push(result);
			});
		};

		let waitForSerial = Promise.resolve();
		return runnables.reduce((prev, runnable) => {
			if (runnable.metadata.serial || this.serial) {
				waitForSerial = prev.then(() => {
					// Serial runnables run as long as there was no previous failure, unless
					// the runnable should always be run.
					return (allPassed || runnable.metadata.always) && runAndStoreResult(runnable);
				});
				return waitForSerial;
			}

			return Promise.all([
				prev,
				waitForSerial.then(() => {
					// Concurrent runnables are kicked off after the previous serial
					// runnables have completed, as long as there was no previous failure
					// (or if the runnable should always be run). One concurrent runnable's
					// failure does not prevent the next runnable from running.
					return (allPassed || runnable.metadata.always) && runAndStoreResult(runnable);
				})
			]);
		}, waitForSerial).then(() => ({allPassed, storedResults}));
	}

	runSingle(runnable) {
		this.onRun(runnable);
		return runnable.run().then(result => {
			// If run() throws or rejects then the entire test run crashes, so
			// onRunComplete() doesn't *have* to be inside a finally().
			this.onRunComplete(runnable);
			return result;
		});
	}

	runHooks(tasks, contextRef, titleSuffix) {
		const hooks = tasks.map(task => new Runnable({
			contextRef,
			failWithoutAssertions: false,
			fn: task.args.length === 0 ?
				task.implementation :
				t => task.implementation.apply(null, [t].concat(task.args)),
			compareTestSnapshot: this.boundCompareTestSnapshot,
			updateSnapshots: this.updateSnapshots,
			metadata: task.metadata,
			title: `${task.title}${titleSuffix || ''}`
		}));
		return this.runMultiple(hooks, this.serial).then(outcome => {
			if (outcome.allPassed) {
				return true;
			}

			// Only emit results for failed hooks.
			for (const result of outcome.storedResults) {
				if (!result.passed) {
					this.stats.failedHookCount++;
					this.emit('hook-failed', result);
				}
			}
			return false;
		});
	}

	runTest(task, contextRef) {
		const hookSuffix = ` for ${task.title}`;
		return this.runHooks(this.tasks.beforeEach, contextRef, hookSuffix).then(hooksOk => {
			// Don't run the test if a `beforeEach` hook failed.
			if (!hooksOk) {
				return false;
			}

			const test = new Runnable({
				contextRef,
				failWithoutAssertions: this.failWithoutAssertions,
				fn: task.args.length === 0 ?
					task.implementation :
					t => task.implementation.apply(null, [t].concat(task.args)),
				compareTestSnapshot: this.boundCompareTestSnapshot,
				updateSnapshots: this.updateSnapshots,
				metadata: task.metadata,
				title: task.title
			});
			return this.runSingle(test).then(result => {
				if (!result.passed) {
					this.stats.failCount++;
					this.emit('test', result);
					// Don't run `afterEach` hooks if the test failed.
					return false;
				}

				if (result.metadata.failing) {
					this.stats.knownFailureCount++;
				} else {
					this.stats.passCount++;
				}
				this.emit('test', result);
				return this.runHooks(this.tasks.afterEach, contextRef, hookSuffix);
			});
		}).then(hooksAndTestOk => {
			return this.runHooks(this.tasks.afterEachAlways, contextRef, hookSuffix).then(alwaysOk => {
				return hooksAndTestOk && alwaysOk;
			});
		});
	}

	start() {
		const runOnlyExclusive = this.stats.hasExclusive || this.runOnlyExclusive;

		const todoTitles = [];
		for (const task of this.tasks.todo) {
			if (runOnlyExclusive && !task.metadata.exclusive) {
				continue;
			}

			this.stats.testCount++;
			this.stats.todoCount++;
			todoTitles.push(task.title);
		}

		const concurrentTests = [];
		const serialTests = [];
		const skippedTests = [];
		for (const task of this.tasks.serial) {
			if (runOnlyExclusive && !task.metadata.exclusive) {
				continue;
			}

			this.stats.testCount++;
			if (task.metadata.skipped) {
				this.stats.skipCount++;
				skippedTests.push({
					failing: task.metadata.failing,
					title: task.title
				});
			} else {
				serialTests.push(task);
			}
		}
		for (const task of this.tasks.concurrent) {
			if (runOnlyExclusive && !task.metadata.exclusive) {
				continue;
			}

			this.stats.testCount++;
			if (task.metadata.skipped) {
				this.stats.skipCount++;
				skippedTests.push({
					failing: task.metadata.failing,
					title: task.title
				});
			} else if (this.serial) {
				serialTests.push(task);
			} else {
				concurrentTests.push(task);
			}
		}

		if (concurrentTests.length === 0 && serialTests.length === 0) {
			this.emit('start', {
				// `ended` is always resolved with `undefined`.
				ended: Promise.resolve(undefined),
				skippedTests,
				stats: this.stats,
				todoTitles
			});
			// Don't run any hooks if there are no tests to run.
			return;
		}

		const contextRef = new ContextRef();

		// Note that the hooks and tests always begin running asynchronously.
		const beforePromise = this.runHooks(this.tasks.before, contextRef);
		const serialPromise = beforePromise.then(beforeHooksOk => {
			// Don't run tests if a `before` hook failed.
			if (!beforeHooksOk) {
				return false;
			}

			return serialTests.reduce((prev, task) => {
				return prev.then(prevOk => {
					// Don't start tests after an interrupt.
					if (this.interrupted) {
						return prevOk;
					}

					// Prevent subsequent tests from running if `failFast` is enabled and
					// the previous test failed.
					if (!prevOk && this.failFast) {
						return false;
					}

					return this.runTest(task, contextRef.copy());
				});
			}, Promise.resolve(true));
		});
		const concurrentPromise = Promise.all([beforePromise, serialPromise]).then(prevOkays => {
			const beforeHooksOk = prevOkays[0];
			const serialOk = prevOkays[1];
			// Don't run tests if a `before` hook failed, or if `failFast` is enabled
			// and a previous serial test failed.
			if (!beforeHooksOk || (!serialOk && this.failFast)) {
				return false;
			}

			// Don't start tests after an interrupt.
			if (this.interrupted) {
				return true;
			}

			// If a concurrent test fails, even if `failFast` is enabled it won't
			// stop other concurrent tests from running.
			return Promise.all(concurrentTests.map(task => {
				return this.runTest(task, contextRef.copy());
			})).then(allOkays => allOkays.every(ok => ok));
		});

		const beforeExitHandler = this.beforeExitHandler.bind(this);
		process.on('beforeExit', beforeExitHandler);

		const ended = concurrentPromise
			// Only run `after` hooks if all hooks and tests passed.
			.then(ok => ok && this.runHooks(this.tasks.after, contextRef))
			// Always run `after.always` hooks.
			.then(() => this.runHooks(this.tasks.afterAlways, contextRef))
			.then(() => {
				process.removeListener('beforeExit', beforeExitHandler);
				// `ended` is always resolved with `undefined`.
				return undefined;
			});

		this.emit('start', {
			ended,
			skippedTests,
			stats: this.stats,
			todoTitles
		});
	}

	interrupt() {
		this.interrupted = true;
	}
}

module.exports = Runner;
