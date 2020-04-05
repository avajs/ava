'use strict';
const Emittery = require('emittery');
const matcher = require('matcher');
const ContextRef = require('./context-ref');
const createChain = require('./create-chain');
const parseTestArgs = require('./parse-test-args');
const snapshotManager = require('./snapshot-manager');
const serializeError = require('./serialize-error');
const Runnable = require('./test');

class Runner extends Emittery {
	constructor(options = {}) {
		super();

		this.experiments = options.experiments || {};
		this.failFast = options.failFast === true;
		this.failWithoutAssertions = options.failWithoutAssertions !== false;
		this.file = options.file;
		this.match = options.match || [];
		this.powerAssert = undefined; // Assigned later.
		this.projectDir = options.projectDir;
		this.recordNewSnapshots = options.recordNewSnapshots === true;
		this.runOnlyExclusive = options.runOnlyExclusive === true;
		this.serial = options.serial === true;
		this.snapshotDir = options.snapshotDir;
		this.updateSnapshots = options.updateSnapshots;

		this.activeRunnables = new Set();
		this.boundCompareTestSnapshot = this.compareTestSnapshot.bind(this);
		this.interrupted = false;
		this.snapshots = null;
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
		this.registerUniqueTitle = title => {
			if (uniqueTestTitles.has(title)) {
				return false;
			}

			uniqueTestTitles.add(title);
			return true;
		};

		let hasStarted = false;
		let scheduledStart = false;
		const chainOptions = {
			annotations: {
				always: false,
				callback: false,
				exclusive: false,
				failing: false,
				inline: false, // Default value; only attempts created by `t.try()` have this annotation set to `true`.
				serial: false,
				skipped: false,
				todo: false
			},
			meta: Object.freeze({
				file: options.file,
				get snapshotDirectory() {
					const {file, snapshotDir: fixedLocation, projectDir} = options;
					return snapshotManager.determineSnapshotDir({file, fixedLocation, projectDir});
				}
			}),
			declare: ({annotations, args: declarationArguments}) => { // eslint-disable-line complexity
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

				const {args, buildTitle, implementations, rawTitle} = parseTestArgs(declarationArguments);

				if (annotations.todo) {
					if (implementations.length > 0) {
						throw new TypeError('`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.');
					}

					if (!rawTitle) { // Either undefined or a string.
						throw new TypeError('`todo` tests require a title');
					}

					if (!this.registerUniqueTitle(rawTitle)) {
						throw new Error(`Duplicate test title: ${rawTitle}`);
					}

					if (this.match.length > 0) {
						// --match selects TODO tests.
						if (matcher([rawTitle], this.match).length === 1) {
							annotations.exclusive = true;
							this.runOnlyExclusive = true;
						}
					}

					this.tasks.todo.push({title: rawTitle, annotations});
					this.emit('stateChange', {
						type: 'declared-test',
						title: rawTitle,
						knownFailing: false,
						todo: true
					});
				} else {
					if (implementations.length === 0) {
						throw new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.');
					}

					for (const implementation of implementations) {
						let {title, isSet, isValid, isEmpty} = buildTitle(implementation);

						if (isSet && !isValid) {
							throw new TypeError('Test & hook titles must be strings');
						}

						if (isEmpty) {
							if (annotations.type === 'test') {
								throw new TypeError('Tests must have a title');
							} else if (annotations.always) {
								title = `${annotations.type}.always hook`;
							} else {
								title = `${annotations.type} hook`;
							}
						}

						if (annotations.type === 'test' && !this.registerUniqueTitle(title)) {
							throw new Error(`Duplicate test title: ${title}`);
						}

						const task = {
							annotations: {...annotations},
							args,
							implementation,
							title
						};

						if (annotations.type === 'test') {
							if (this.match.length > 0) {
								// --match overrides .only()
								task.annotations.exclusive = matcher([title], this.match).length === 1;
							}

							if (task.annotations.exclusive) {
								this.runOnlyExclusive = true;
							}

							this.tasks[annotations.serial ? 'serial' : 'concurrent'].push(task);
							this.emit('stateChange', {
								type: 'declared-test',
								title,
								knownFailing: annotations.failing,
								todo: false
							});
						} else if (!annotations.skipped) {
							this.tasks[annotations.type + (annotations.always ? 'Always' : '')].push(task);
						}
					}
				}
			}
		};

		this.chain = createChain({
			allowCallbacks: true,
			...chainOptions
		});

		if (this.experiments.experimentalTestInterfaces) {
			this.experimentalChain = createChain({
				allowCallbacks: false,
				...chainOptions
			});
		}
	}

	compareTestSnapshot(options) {
		if (!this.snapshots) {
			this.snapshots = snapshotManager.load({
				file: this.file,
				fixedLocation: this.snapshotDir,
				projectDir: this.projectDir,
				recordNewSnapshots: this.recordNewSnapshots,
				updating: this.updateSnapshots
			});
			this.emit('dependency', this.snapshots.snapPath);
		}

		return this.snapshots.compare(options);
	}

	saveSnapshotState() {
		if (this.snapshots) {
			return this.snapshots.save();
		}

		if (this.updateSnapshots) {
			// TODO: There may be unused snapshot files if no test caused the
			// snapshots to be loaded. Prune them. But not if tests (including hooks!)
			// were skipped. Perhaps emit a warning if this occurs?
		}

		return null;
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

	async runMultiple(runnables) {
		let allPassed = true;
		const storedResults = [];
		const runAndStoreResult = async runnable => {
			const result = await this.runSingle(runnable);
			if (!result.passed) {
				allPassed = false;
			}

			storedResults.push(result);
		};

		let waitForSerial = Promise.resolve();
		await runnables.reduce((previous, runnable) => {
			if (runnable.annotations.serial || this.serial) {
				waitForSerial = previous.then(() => {
					// Serial runnables run as long as there was no previous failure, unless
					// the runnable should always be run.
					return (allPassed || runnable.annotations.always) && runAndStoreResult(runnable);
				});
				return waitForSerial;
			}

			return Promise.all([
				previous,
				waitForSerial.then(() => {
					// Concurrent runnables are kicked off after the previous serial
					// runnables have completed, as long as there was no previous failure
					// (or if the runnable should always be run). One concurrent runnable's
					// failure does not prevent the next runnable from running.
					return (allPassed || runnable.annotations.always) && runAndStoreResult(runnable);
				})
			]);
		}, waitForSerial);

		return {allPassed, storedResults};
	}

	async runSingle(runnable) {
		this.onRun(runnable);
		const result = await runnable.run();
		// If run() throws or rejects then the entire test run crashes, so
		// onRunComplete() doesn't *have* to be inside a finally.
		this.onRunComplete(runnable);
		return result;
	}

	async runHooks(tasks, contextRef, titleSuffix, testPassed) {
		const hooks = tasks.map(task => new Runnable({
			annotations: task.annotations,
			contextRef,
			experiments: this.experiments,
			failWithoutAssertions: false,
			fn: task.args.length === 0 ?
				task.implementation :
				t => task.implementation.apply(null, [t].concat(task.args)),
			compareTestSnapshot: this.boundCompareTestSnapshot,
			updateSnapshots: this.updateSnapshots,
			powerAssert: this.powerAssert,
			title: `${task.title}${titleSuffix || ''}`,
			testPassed
		}));
		const outcome = await this.runMultiple(hooks, this.serial);
		for (const result of outcome.storedResults) {
			if (result.passed) {
				this.emit('stateChange', {
					type: 'hook-finished',
					title: result.title,
					duration: result.duration,
					logs: result.logs
				});
			} else {
				this.emit('stateChange', {
					type: 'hook-failed',
					title: result.title,
					err: serializeError('Hook failure', true, result.error),
					duration: result.duration,
					logs: result.logs
				});
			}
		}

		return outcome.allPassed;
	}

	async runTest(task, contextRef) {
		const hookSuffix = ` for ${task.title}`;
		let hooksOk = await this.runHooks(this.tasks.beforeEach, contextRef, hookSuffix);

		let testOk = false;
		if (hooksOk) {
			// Only run the test if all `beforeEach` hooks passed.
			const test = new Runnable({
				annotations: task.annotations,
				contextRef,
				experiments: this.experiments,
				failWithoutAssertions: this.failWithoutAssertions,
				fn: task.args.length === 0 ?
					task.implementation :
					t => task.implementation.apply(null, [t].concat(task.args)),
				compareTestSnapshot: this.boundCompareTestSnapshot,
				updateSnapshots: this.updateSnapshots,
				powerAssert: this.powerAssert,
				title: task.title,
				registerUniqueTitle: this.registerUniqueTitle
			});

			const result = await this.runSingle(test);
			testOk = result.passed;

			if (testOk) {
				this.emit('stateChange', {
					type: 'test-passed',
					title: result.title,
					duration: result.duration,
					knownFailing: result.annotations.failing,
					logs: result.logs
				});

				hooksOk = await this.runHooks(this.tasks.afterEach, contextRef, hookSuffix, testOk);
			} else {
				this.emit('stateChange', {
					type: 'test-failed',
					title: result.title,
					err: serializeError('Test failure', true, result.error),
					duration: result.duration,
					knownFailing: result.annotations.failing,
					logs: result.logs
				});
				// Don't run `afterEach` hooks if the test failed.
			}
		}

		const alwaysOk = await this.runHooks(this.tasks.afterEachAlways, contextRef, hookSuffix, testOk);
		return alwaysOk && hooksOk && testOk;
	}

	async start() {
		const concurrentTests = [];
		const serialTests = [];
		for (const task of this.tasks.serial) {
			if (this.runOnlyExclusive && !task.annotations.exclusive) {
				continue;
			}

			this.emit('stateChange', {
				type: 'selected-test',
				title: task.title,
				knownFailing: task.annotations.failing,
				skip: task.annotations.skipped,
				todo: false
			});

			if (!task.annotations.skipped) {
				serialTests.push(task);
			}
		}

		for (const task of this.tasks.concurrent) {
			if (this.runOnlyExclusive && !task.annotations.exclusive) {
				continue;
			}

			this.emit('stateChange', {
				type: 'selected-test',
				title: task.title,
				knownFailing: task.annotations.failing,
				skip: task.annotations.skipped,
				todo: false
			});

			if (!task.annotations.skipped) {
				if (this.serial) {
					serialTests.push(task);
				} else {
					concurrentTests.push(task);
				}
			}
		}

		for (const task of this.tasks.todo) {
			if (this.runOnlyExclusive && !task.annotations.exclusive) {
				continue;
			}

			this.emit('stateChange', {
				type: 'selected-test',
				title: task.title,
				knownFailing: false,
				skip: false,
				todo: true
			});
		}

		if (concurrentTests.length === 0 && serialTests.length === 0) {
			this.emit('finish');
			// Don't run any hooks if there are no tests to run.
			return;
		}

		const contextRef = new ContextRef();

		// Note that the hooks and tests always begin running asynchronously.
		const beforePromise = this.runHooks(this.tasks.before, contextRef);
		const serialPromise = beforePromise.then(beforeHooksOk => { // eslint-disable-line promise/prefer-await-to-then
			// Don't run tests if a `before` hook failed.
			if (!beforeHooksOk) {
				return false;
			}

			return serialTests.reduce(async (previous, task) => {
				const previousOk = await previous;
				// Don't start tests after an interrupt.
				if (this.interrupted) {
					return previousOk;
				}

				// Prevent subsequent tests from running if `failFast` is enabled and
				// the previous test failed.
				if (!previousOk && this.failFast) {
					return false;
				}

				return this.runTest(task, contextRef.copy());
			}, true);
		});
		const concurrentPromise = Promise.all([beforePromise, serialPromise]).then(async ([beforeHooksOk, serialOk]) => { // eslint-disable-line promise/prefer-await-to-then
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
			const allOkays = await Promise.all(concurrentTests.map(task => {
				return this.runTest(task, contextRef.copy());
			}));
			return allOkays.every(ok => ok);
		});

		const beforeExitHandler = this.beforeExitHandler.bind(this);
		process.on('beforeExit', beforeExitHandler);

		try {
			const ok = await concurrentPromise;
			// Only run `after` hooks if all hooks and tests passed.
			if (ok) {
				await this.runHooks(this.tasks.after, contextRef);
			}

			// Always run `after.always` hooks.
			await this.runHooks(this.tasks.afterAlways, contextRef);
			process.removeListener('beforeExit', beforeExitHandler);
			await this.emit('finish');
		} catch (error) {
			await this.emit('error', error);
		}
	}

	interrupt() {
		this.interrupted = true;
	}
}

module.exports = Runner;
