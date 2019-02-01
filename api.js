'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const debug = require('debug')('ava:api');
const commonPathPrefix = require('common-path-prefix');
const escapeStringRegexp = require('escape-string-regexp');
const uniqueTempDir = require('unique-temp-dir');
const isCi = require('is-ci');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash.debounce');
const arrify = require('arrify');
const makeDir = require('make-dir');
const ms = require('ms');
const chunkd = require('chunkd');
const babelPipeline = require('./lib/babel-pipeline');
const Emittery = require('./lib/emittery');
const RunStatus = require('./lib/run-status');
const AvaFiles = require('./lib/ava-files');
const Fork = require('./lib/fork');
const serializeError = require('./lib/serialize-error');

const ForkTestPool = require('./lib/test-pools/fork-test-pool');
const SharedForkTestPool = require('./lib/test-pools/shared-fork-test-pool');
const SingleProcessTestPool = require('./lib/test-pools/single-process-test-pool');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === null) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

class Api extends Emittery {
	constructor(options) {
		super();

		this.options = Object.assign({match: []}, options);
		this.options.require = resolveModules(this.options.require);

		this._allExtensions = this.options.extensions.all;
		this._regexpFullExtensions = new RegExp(`\\.(${this.options.extensions.full.map(ext => escapeStringRegexp(ext)).join('|')})$`);
		this._precompiler = null;
		this._interruptHandler = () => {};

		if (options.ranFromCli) {
			process.on('SIGINT', () => this._interruptHandler());
		}
	}

	run(files, runtimeOptions = {}) {
		const apiOptions = this.options;
		this.bailed = false;
		// Each run will have its own status. It can only be created when test files
		// have been found.
		let runStatus;
		// Irrespectively, perform some setup now, before finding test files.

		// Track active forks and manage timeouts.
		const failFast = apiOptions.failFast === true;
		const pendingWorkers = new Set();
		const timedOutWorkerFiles = new Set();
		let restartTimer;
		if (apiOptions.timeout) {
			const timeout = ms(apiOptions.timeout);

			restartTimer = debounce(() => {
				// If failFast is active, prevent new test files from running after
				// the current ones are exited.
				if (failFast) {
					this.bailed = true;
				}

				runStatus.emitStateChange({type: 'timeout', period: timeout});

				for (const worker of pendingWorkers) {
					timedOutWorkerFiles.add(worker.file);
					worker.exit();
				}
			}, timeout);
		} else {
			restartTimer = Object.assign(() => {}, {cancel() {}});
		}

		this._interruptHandler = () => {
			if (this.bailed) {
				// Exiting already
				return;
			}

			// Prevent new test files from running
			this.bailed = true;

			// Make sure we don't run the timeout handler
			restartTimer.cancel();

			runStatus.emitStateChange({type: 'interrupt'});

			for (const worker of pendingWorkers) {
				worker.exit();
			}
		};

		// Find all test files.
		return new AvaFiles({cwd: apiOptions.resolveTestsFrom, files, extensions: this._allExtensions}).findTestFiles()
			.then(files => {
				if (this.options.parallelRuns) {
					const {currentIndex, totalRuns} = this.options.parallelRuns;
					const fileCount = files.length;

					// The files must be in the same order across all runs, so sort them.
					files = files.sort((a, b) => a.localeCompare(b, [], {numeric: true}));
					files = chunkd(files, currentIndex, totalRuns);

					const currentFileCount = files.length;

					runStatus = new RunStatus(fileCount, {currentFileCount, currentIndex, totalRuns});
				} else {
					runStatus = new RunStatus(files.length, null);
				}

				const emittedRun = this.emit('run', {
					clearLogOnNextRun: runtimeOptions.clearLogOnNextRun === true,
					failFastEnabled: failFast,
					filePathPrefix: commonPathPrefix(files),
					files,
					matching: apiOptions.match.length > 0,
					previousFailures: runtimeOptions.previousFailures || 0,
					runOnlyExclusive: runtimeOptions.runOnlyExclusive === true,
					runVector: runtimeOptions.runVector || 0,
					status: runStatus
				});

				// Bail out early if no files were found.
				if (files.length === 0) {
					return emittedRun.then(() => {
						return runStatus;
					});
				}

				runStatus.on('stateChange', record => {
					if (record.testFile && !timedOutWorkerFiles.has(record.testFile)) {
						// Restart the timer whenever there is activity from workers that
						// haven't already timed out.
						restartTimer();
					}

					if (failFast && (record.type === 'hook-failed' || record.type === 'test-failed' || record.type === 'worker-failed')) {
						// Prevent new test files from running once a test has failed.
						this.bailed = true;

						// Try to stop currently scheduled tests.
						for (const worker of pendingWorkers) {
							worker.notifyOfPeerFailure();
						}
					}
				});

				return emittedRun
					.then(() => this._setupPrecompiler())
					.then(precompilation => {
						if (!precompilation.enabled) {
							return null;
						}

						// Compile all test and helper files. Assumes the tests only load
						// helpers from within the `resolveTestsFrom` directory. Without
						// arguments this is the `projectDir`, else it's `process.cwd()`
						// which may be nested too deeply.
						return new AvaFiles({cwd: this.options.resolveTestsFrom, extensions: this._allExtensions})
							.findTestHelpers().then(helpers => {
								return {
									cacheDir: precompilation.cacheDir,
									map: [...files, ...helpers].reduce((acc, file) => {
										try {
											const realpath = fs.realpathSync(file);
											const filename = path.basename(realpath);
											const cachePath = this._regexpFullExtensions.test(filename) ?
												precompilation.precompileFull(realpath) :
												precompilation.precompileEnhancementsOnly(realpath);
											if (cachePath) {
												acc[realpath] = cachePath;
											}
										} catch (error) {
											throw Object.assign(error, {file});
										}

										return acc;
									}, {})
								};
							});
					})
					.then(precompilation => {
						// Resolve the correct concurrency value.
						let concurrency = Math.min(os.cpus().length, isCi ? 2 : Infinity);
						if (apiOptions.concurrency > 0) {
							concurrency = apiOptions.concurrency;
						}

						if (apiOptions.serial) {
							concurrency = 1;
						}

						// Default to using a new fork for each test (provides most isolation)
						let ProcessPool = ForkTestPool;

						if (apiOptions.shareForks) {
							ProcessPool = SharedForkTestPool;
						} else if (apiOptions.singleProcess) {
							ProcessPool = SingleProcessTestPool;
						}

						debug('got concurrency', apiOptions.concurrency);
						debug('using ', ProcessPool.name);
						debug('use workers', apiOptions.workerThreads);

						// Initialize options to pass to workers
						const workerOptions = Object.assign({}, apiOptions, {
							// If we're looking for matches, run every single test process in exclusive-only mode
							runOnlyExclusive: apiOptions.match.length > 0 || runtimeOptions.runOnlyExclusive === true
						});
						if (precompilation) {
							workerOptions.cacheDir = precompilation.cacheDir;
							workerOptions.precompiled = precompilation.map;
						} else {
							workerOptions.precompiled = {};
						}

						if (runtimeOptions.updateSnapshots) {
							// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
							workerOptions.updateSnapshots = true;
						}

						this.Fork = Fork;

						const testPool = new ProcessPool({
							api: this,
							runStatus,
							apiOptions,
							concurrency,
							restartTimer,
							workerOptions,
							pendingWorkers,
							precompilation
						});

						return testPool.run(files, runtimeOptions);
					})
					.catch(err => {
						runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, err)});
					})
					.then(() => {
						restartTimer.cancel();
						return runStatus;
					});
			});
	}

	_setupPrecompiler() {
		if (this._precompiler) {
			return this._precompiler;
		}

		const cacheDir = this.options.cacheEnabled === false ?
			uniqueTempDir() :
			path.join(this.options.projectDir, 'node_modules', '.cache', 'ava');

		// Ensure cacheDir exists
		makeDir.sync(cacheDir);

		const {projectDir, babelConfig} = this.options;
		const compileEnhancements = this.options.compileEnhancements !== false;
		const precompileFull = babelConfig ?
			babelPipeline.build(projectDir, cacheDir, babelConfig, compileEnhancements) :
			filename => {
				throw new Error(`Cannot apply full precompilation, possible bad usage: ${filename}`);
			};

		let precompileEnhancementsOnly = () => null;
		if (compileEnhancements) {
			precompileEnhancementsOnly = this.options.extensions.enhancementsOnly.length > 0 ?
				babelPipeline.build(projectDir, cacheDir, null, compileEnhancements) :
				filename => {
					throw new Error(`Cannot apply enhancement-only precompilation, possible bad usage: ${filename}`);
				};
		}

		this._precompiler = {
			cacheDir,
			enabled: babelConfig || compileEnhancements,
			precompileEnhancementsOnly,
			precompileFull
		};
		return this._precompiler;
	}
}

module.exports = Api;
