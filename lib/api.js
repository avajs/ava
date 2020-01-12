'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const commonPathPrefix = require('common-path-prefix');
const isCi = require('is-ci');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash/debounce');
const arrify = require('arrify');
const ms = require('ms');
const chunkd = require('chunkd');
const Emittery = require('emittery');
const tempDir = require('temp-dir');
const globs = require('./globs');
const RunStatus = require('./run-status');
const serializeError = require('./serialize-error');
const forkFileRunner = require('./fork-file-runner');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === undefined) {
			throw new Error(`Could not resolve required module '${name}'`);
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

		// Each run will have its own status. It can only be created when test files
		// have been found.
		let runStatus;
		// Irrespectively, perform some setup now, before finding test files.

		let timeoutKeepAlive;
		if (this.options.timeout && !this.options.debug) {
			const timeout = ms(this.options.timeout);

			timeoutKeepAlive = debounce(() => {
				// If failFast is active, prevent new test files from running after
				// the current ones are exited.
				if (this.options.failFast) {
					runStatus.emitStateChange({type: 'bailed'});
				}

				runStatus.emitStateChange({type: 'timeout', period: timeout});
			}, timeout);
		} else {
			timeoutKeepAlive = Object.assign(() => {}, {cancel() {}});
		}

		this._interruptHandler = () => {
			if (runStatus.bailed) {
				// Exiting already
				return;
			}

			// Prevent new test files from running
			runStatus.emitStateChange({type: 'bailed'});

			// Make sure we don't run the timeout handler
			timeoutKeepAlive.cancel();

			runStatus.emitStateChange({type: 'interrupt'});
		};

		try {
			this._createCacheDir();
			const testFiles = await globs.findTests({cwd: this.options.projectDir, ...this.options.globs});
			if (selectedFiles.length === 0) {
				if (filter.length === 0) {
					selectedFiles = testFiles;
				} else {
					selectedFiles = globs.applyTestFileFilter({cwd: this.options.projectDir, filter, testFiles});
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

			const debugWithoutSpecificFile = Boolean(this.options.debug) && selectedFiles.length !== 1;

			await this.emit('run', {
				bailWithoutReporting: debugWithoutSpecificFile,
				clearLogOnNextRun: runtimeOptions.clearLogOnNextRun === true,
				debug: Boolean(this.options.debug),
				failFastEnabled: this.options.failFast === true,
				filePathPrefix: getFilePathPrefix(selectedFiles),
				files: selectedFiles,
				matching: this.options.match.length > 0,
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

			if (this.options.failFast) {
				runStatus.on('stateChange', record => {
					if (record.type === 'hook-failed' || record.type === 'test-failed' || record.type === 'worker-failed') {
						// Prevent new test files from running once a test has failed.
						runStatus.emitStateChange({type: 'bailed'});
					}
				});
			}

			const babelState = this.options.babelProvider ? await this.options.babelProvider.compile({cacheDir: this._cacheDir, files: selectedFiles}) : null;

			// Resolve the correct concurrency value.
			let concurrency = Math.min(os.cpus().length, isCi ? 2 : Infinity);
			if (this.options.concurrency > 0) {
				concurrency = this.options.concurrency;
			}

			if (this.options.serial) {
				concurrency = 1;
			}

			const runnerOptions = {
				files: selectedFiles,
				concurrency,
				babelState,
				apiOptions: this.options,
				runtimeOptions,
				timeoutKeepAlive,
				recordNewSnapshots: !isCi,
				// If we're looking for matches, run every single test process in exclusive-only mode
				runOnlyExclusive: this.options.match.length > 0 || runtimeOptions.runOnlyExclusive === true,
				updateSnapshots: runtimeOptions.updateSnapshots || this.options.updateSnapshots
			};
			await forkFileRunner(runnerOptions, runStatus);
		} catch (error) {
			if (error && error.name === 'AggregateError') {
				for (const err of error) {
					runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, err)});
				}
			} else {
				runStatus.emitStateChange({type: 'internal-error', err: serializeError('Internal error', false, error)});
			}
		}

		timeoutKeepAlive.cancel();
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
