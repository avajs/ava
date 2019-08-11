'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const commonPathPrefix = require('common-path-prefix');
const escapeStringRegexp = require('escape-string-regexp');
const uniqueTempDir = require('unique-temp-dir');
const isCi = require('is-ci');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash/debounce');
const Bluebird = require('bluebird');
const getPort = require('get-port');
const arrify = require('arrify');
const makeDir = require('make-dir');
const ms = require('ms');
const chunkd = require('chunkd');
const Emittery = require('emittery');
const babelPipeline = require('./babel-pipeline');
const globs = require('./globs');
const RunStatus = require('./run-status');
const fork = require('./fork');
const serializeError = require('./serialize-error');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === undefined) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

class Api extends Emittery {
	constructor(options) {
		super();

		this.options = {match: [], ...options};
		this.options.require = resolveModules(this.options.require);

		this._allExtensions = this.options.extensions.all;
		this._regexpFullExtensions = new RegExp(`\\.(${this.options.extensions.full.map(ext => escapeStringRegexp(ext)).join('|')})$`);
		this._precompiler = null;
		this._interruptHandler = () => {};

		if (options.ranFromCli) {
			process.on('SIGINT', () => this._interruptHandler());
		}
	}

	async run(files = [], runtimeOptions = {}) {
		let setupOrGlobError;
		files = files.map(file => path.resolve(this.options.resolveTestsFrom, file));

		const apiOptions = this.options;

		// Each run will have its own status. It can only be created when test files
		// have been found.
		let runStatus;
		// Irrespectively, perform some setup now, before finding test files.

		// Track active forks and manage timeouts.
		const failFast = apiOptions.failFast === true;
		let bailed = false;
		const pendingWorkers = new Set();
		const timedOutWorkerFiles = new Set();
		let restartTimer;
		if (apiOptions.timeout) {
			const timeout = ms(apiOptions.timeout);

			restartTimer = debounce(() => {
				// If failFast is active, prevent new test files from running after
				// the current ones are exited.
				if (failFast) {
					bailed = true;
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
			if (bailed) {
				// Exiting already
				return;
			}

			// Prevent new test files from running
			bailed = true;

			// Make sure we don't run the timeout handler
			restartTimer.cancel();

			runStatus.emitStateChange({type: 'interrupt'});

			for (const worker of pendingWorkers) {
				worker.exit();
			}
		};

		let precompiler;
		let helpers;

		try {
			precompiler = await this._setupPrecompiler(); // eslint-disable-line require-atomic-updates
			helpers = [];
			if (files.length === 0 || precompiler.enabled) {
				let found;
				if (precompiler.enabled) {
					found = await globs.findHelpersAndTests({cwd: this.options.resolveTestsFrom, ...apiOptions.globs});
					helpers = found.helpers;
				} else {
					found = await globs.findTests({cwd: this.options.resolveTestsFrom, ...apiOptions.globs});
				}

				if (files.length === 0) {
					({tests: files} = found);
				}
			}
		} catch (error) {
			files = [];
			setupOrGlobError = error;
		}

		try {
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

			await this.emit('run', {
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

			if (setupOrGlobError) {
				throw setupOrGlobError;
			}

			// Bail out early if no files were found.
			if (files.length === 0) {
				return runStatus;
			}

			runStatus.on('stateChange', record => {
				if (record.testFile && !timedOutWorkerFiles.has(record.testFile)) {
					// Restart the timer whenever there is activity from workers that
					// haven't already timed out.
					restartTimer();
				}

				if (failFast && (record.type === 'hook-failed' || record.type === 'test-failed' || record.type === 'worker-failed')) {
					// Prevent new test files from running once a test has failed.
					bailed = true;

					// Try to stop currently scheduled tests.
					for (const worker of pendingWorkers) {
						worker.notifyOfPeerFailure();
					}
				}
			});

			let precompilation = null;
			if (precompiler.enabled) {
				// Compile all test and helper files. Assumes the tests only load
				// helpers from within the `resolveTestsFrom` directory. Without
				// arguments this is the `projectDir`, else it's `process.cwd()`
				// which may be nested too deeply.
				precompilation = {
					cacheDir: precompiler.cacheDir,
					map: [...files, ...helpers].reduce((acc, file) => {
						try {
							const realpath = fs.realpathSync(file);
							const filename = path.basename(realpath);
							const cachePath = this._regexpFullExtensions.test(filename) ?
								precompiler.precompileFull(realpath) :
								precompiler.precompileEnhancementsOnly(realpath);
							if (cachePath) {
								acc[realpath] = cachePath;
							}
						} catch (error) {
							throw Object.assign(error, {file});
						}

						return acc;
					}, {})
				};
			}

			// Resolve the correct concurrency value.
			let concurrency = Math.min(os.cpus().length, isCi ? 2 : Infinity);
			if (apiOptions.concurrency > 0) {
				concurrency = apiOptions.concurrency;
			}

			if (apiOptions.serial) {
				concurrency = 1;
			}

			// Try and run each file, limited by `concurrency`.
			await Bluebird.map(files, async file => {
				// No new files should be run once a test has timed out or failed,
				// and failFast is enabled.
				if (bailed) {
					return;
				}

				const execArgv = await this._computeForkExecArgv();
				const options = {
					...apiOptions,
					recordNewSnapshots: !isCi,
					// If we're looking for matches, run every single test process in exclusive-only mode
					runOnlyExclusive: apiOptions.match.length > 0 || runtimeOptions.runOnlyExclusive === true
				};
				if (precompilation) {
					options.cacheDir = precompilation.cacheDir;
					options.precompiled = precompilation.map;
				} else {
					options.precompiled = {};
				}

				if (runtimeOptions.updateSnapshots) {
					// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
					options.updateSnapshots = true;
				}

				const worker = fork(file, options, execArgv);
				runStatus.observeWorker(worker, file);

				pendingWorkers.add(worker);
				worker.promise.then(() => {
					pendingWorkers.delete(worker);
				});
				restartTimer();

				return worker.promise;
			}, {concurrency});
		} catch (error) {
			runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, error)});
		}

		restartTimer.cancel();
		return runStatus;
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

	async _computeForkExecArgv() {
		const execArgv = this.options.testOnlyExecArgv || process.execArgv;
		if (execArgv.length === 0) {
			return Promise.resolve(execArgv);
		}

		// --inspect-brk is used in addition to --inspect to break on first line and wait
		const inspectArgIndex = execArgv.findIndex(arg => /^--inspect(-brk)?($|=)/.test(arg));
		if (inspectArgIndex === -1) {
			return Promise.resolve(execArgv);
		}

		const port = await getPort();
		const forkExecArgv = execArgv.slice();
		let flagName = '--inspect';
		const oldValue = forkExecArgv[inspectArgIndex];
		if (oldValue.indexOf('brk') > 0) {
			flagName += '-brk';
		}

		forkExecArgv[inspectArgIndex] = `${flagName}=${port}`;

		return forkExecArgv;
	}
}

module.exports = Api;
