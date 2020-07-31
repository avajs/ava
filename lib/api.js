'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const commonPathPrefix = require('common-path-prefix');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash/debounce');
const arrify = require('arrify');
const ms = require('ms');
const chunkd = require('chunkd');
const Emittery = require('emittery');
const pMap = require('p-map');
const tempDir = require('temp-dir');
const globs = require('./globs');
const isCi = require('./is-ci');
const RunStatus = require('./run-status');
const fork = require('./fork');
const serializeError = require('./serialize-error');
const {getApplicableLineNumbers} = require('./line-numbers');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === undefined) {
			throw new Error(`Could not resolve required module ’${name}’`);
		}

		return modulePath;
	});
}

function getFilePathPrefix(files) {
	if (files.length === 1) {
		// Get the correct prefix up to the basename.
		return commonPathPrefix([files[0], path.dirname(files[0])]);
	}

	return commonPathPrefix(files);
}

class Api extends Emittery {
	constructor(options) {
		super();

		this.options = {match: [], moduleTypes: {}, ...options};
		this.options.require = resolveModules(this.options.require);

		this._cacheDir = null;
		this._interruptHandler = () => {};

		if (options.ranFromCli) {
			process.on('SIGINT', () => this._interruptHandler());
		}
	}

	async run({files: selectedFiles = [], filter = [], runtimeOptions = {}} = {}) {
		let setupOrGlobError;

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
		if (apiOptions.timeout && !apiOptions.debug) {
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

		let cacheDir;
		let testFiles;
		try {
			cacheDir = this._createCacheDir();
			testFiles = await globs.findTests({cwd: this.options.projectDir, ...apiOptions.globs});
			if (selectedFiles.length === 0) {
				if (filter.length === 0) {
					selectedFiles = testFiles;
				} else {
					selectedFiles = globs.applyTestFileFilter({
						cwd: this.options.projectDir,
						filter: filter.map(({pattern}) => pattern),
						testFiles
					});
				}
			}
		} catch (error) {
			selectedFiles = [];
			setupOrGlobError = error;
		}

		try {
			if (this.options.parallelRuns) {
				const {currentIndex, totalRuns} = this.options.parallelRuns;
				const fileCount = selectedFiles.length;

				// The files must be in the same order across all runs, so sort them.
				selectedFiles = selectedFiles.sort((a, b) => a.localeCompare(b, [], {numeric: true}));
				selectedFiles = chunkd(selectedFiles, currentIndex, totalRuns);

				const currentFileCount = selectedFiles.length;

				runStatus = new RunStatus(fileCount, {currentFileCount, currentIndex, totalRuns});
			} else {
				runStatus = new RunStatus(selectedFiles.length, null);
			}

			const debugWithoutSpecificFile = Boolean(this.options.debug) && !this.options.debug.active && selectedFiles.length !== 1;

			await this.emit('run', {
				bailWithoutReporting: debugWithoutSpecificFile,
				clearLogOnNextRun: runtimeOptions.clearLogOnNextRun === true,
				debug: Boolean(this.options.debug),
				failFastEnabled: failFast,
				filePathPrefix: getFilePathPrefix(selectedFiles),
				files: selectedFiles,
				matching: apiOptions.match.length > 0,
				previousFailures: runtimeOptions.previousFailures || 0,
				runOnlyExclusive: runtimeOptions.runOnlyExclusive === true,
				runVector: runtimeOptions.runVector || 0,
				status: runStatus
			});

			if (setupOrGlobError) {
				throw setupOrGlobError;
			}

			// Bail out early if no files were found, or when debugging and there is not a single specific test file to debug.
			if (selectedFiles.length === 0 || debugWithoutSpecificFile) {
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

			const {providers = []} = this.options;
			const providerStates = (await Promise.all(providers.map(async ({type, main}) => {
				const state = await main.compile({cacheDir, files: testFiles});
				return state === null ? null : {type, state};
			}))).filter(state => state !== null);

			// Resolve the correct concurrency value.
			let concurrency = Math.min(os.cpus().length, isCi ? 2 : Infinity);
			if (apiOptions.concurrency > 0) {
				concurrency = apiOptions.concurrency;
			}

			if (apiOptions.serial) {
				concurrency = 1;
			}

			// Try and run each file, limited by `concurrency`.
			await pMap(selectedFiles, async file => {
				// No new files should be run once a test has timed out or failed,
				// and failFast is enabled.
				if (bailed) {
					return;
				}

				const lineNumbers = getApplicableLineNumbers(globs.normalizeFileForMatching(apiOptions.projectDir, file), filter);
				const options = {
					...apiOptions,
					providerStates,
					lineNumbers,
					recordNewSnapshots: !isCi,
					// If we're looking for matches, run every single test process in exclusive-only mode
					runOnlyExclusive: apiOptions.match.length > 0 || runtimeOptions.runOnlyExclusive === true
				};

				if (runtimeOptions.updateSnapshots) {
					// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
					options.updateSnapshots = true;
				}

				const worker = fork(file, options, apiOptions.nodeArguments);
				runStatus.observeWorker(worker, file, {selectingLines: lineNumbers.length > 0});

				pendingWorkers.add(worker);
				worker.promise.then(() => {
					pendingWorkers.delete(worker);
				});
				restartTimer();

				return worker.promise;
			}, {concurrency, stopOnError: false});
		} catch (error) {
			if (error && error.name === 'AggregateError') {
				for (const err of error) {
					runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, err)});
				}
			} else {
				runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, error)});
			}
		}

		restartTimer.cancel();
		return runStatus;
	}

	_createCacheDir() {
		if (this._cacheDir) {
			return this._cacheDir;
		}

		const cacheDir = this.options.cacheEnabled === false ?
			fs.mkdtempSync(`${tempDir}${path.sep}`) :
			path.join(this.options.projectDir, 'node_modules', '.cache', 'ava');

		// Ensure cacheDir exists
		fs.mkdirSync(cacheDir, {recursive: true});

		this._cacheDir = cacheDir;

		return cacheDir;
	}
}

module.exports = Api;
