import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import arrify from 'arrify';
import chunkd from 'chunkd';
import commonPathPrefix from 'common-path-prefix';
import Emittery from 'emittery';
import ms from 'ms';
import pMap from 'p-map';
import tempDir from 'temp-dir';

import fork from './fork.js';
import * as globs from './globs.js';
import isCi from './is-ci.js';
import {getApplicableLineNumbers} from './line-numbers.js';
import {setCappedTimeout} from './now-and-timers.js';
import {observeWorkerProcess} from './plugin-support/shared-workers.js';
import RunStatus from './run-status.js';
import scheduler from './scheduler.js';
import serializeError from './serialize-error.js';

function normalizeRequireOption(require) {
	return arrify(require).map(name => typeof name === 'string' ? arrify(name) : name);
}

function getFilePathPrefix(files) {
	if (files.length === 1) { // eslint-disable-line unicorn/prefer-ternary
		// Get the correct prefix up to the basename.
		return commonPathPrefix([files[0], path.dirname(files[0])]);
	}

	return commonPathPrefix(files);
}

class TimeoutTrigger {
	constructor(fn, waitMs = 0) {
		this.fn = fn.bind(null);
		this.ignoreUntil = 0;
		this.waitMs = waitMs;
		this.timer = undefined;
	}

	debounce() {
		if (this.timer === undefined) {
			this.timer = setCappedTimeout(() => this.trigger(), this.waitMs);
		} else {
			this.timer.refresh();
		}
	}

	discard() {
		// N.B. this.timer is not cleared so if debounce() is called after it will
		// not run again.
		clearTimeout(this.timer);
	}

	ignoreFor(periodMs) {
		this.ignoreUntil = Math.max(this.ignoreUntil, Date.now() + periodMs);
	}

	trigger() {
		if (Date.now() >= this.ignoreUntil) {
			this.fn();
		}
	}
}

export default class Api extends Emittery {
	#cacheDir = null;
	#interruptHandler = () => {};

	constructor(options) {
		super();

		this.options = {match: [], ...options};
		this.options.require = normalizeRequireOption(this.options.require);

		if (options.ranFromCli) {
			process.on('SIGINT', () => this.#interruptHandler());
		}
	}

	#getLocalCacheDir() {
		return path.join(this.options.projectDir, 'node_modules', '.cache', 'ava');
	}

	#createCacheDir() {
		if (this.#cacheDir) {
			return this.#cacheDir;
		}

		const cacheDir = this.options.cacheEnabled === false
			? fs.mkdtempSync(`${tempDir}${path.sep}`)
			: this.#getLocalCacheDir();

		// Ensure cacheDir exists
		fs.mkdirSync(cacheDir, {recursive: true});

		this.#cacheDir = cacheDir;

		return cacheDir;
	}

	async run({files: selectedFiles = [], filter = [], runtimeOptions = {}, testFileSelector} = {}) { // eslint-disable-line complexity
		let setupOrGlobError;

		const apiOptions = this.options;

		// Each run will have its own status. It can only be created when test files
		// have been found.
		let runStatus;
		// Irrespectively, perform some setup now, before finding test files.

		// Track active forks and manage timeouts.
		const isFailFast = apiOptions.failFast === true;
		let hasBailed = false;
		const pendingWorkers = new Set();
		const timedOutWorkerFiles = new Set();
		let timeoutTrigger;
		if (apiOptions.timeout && !apiOptions.debug) {
			const timeout = ms(apiOptions.timeout);

			timeoutTrigger = new TimeoutTrigger(() => {
				// If failFast is active, prevent new test files from running after
				// the current ones are exited.
				if (isFailFast) {
					hasBailed = true;
				}

				runStatus.emitStateChange({type: 'timeout', period: timeout});

				for (const worker of pendingWorkers) {
					timedOutWorkerFiles.add(worker.file);
					worker.exit();
				}
			}, timeout);
		} else {
			timeoutTrigger = new TimeoutTrigger(() => {});
		}

		this.#interruptHandler = () => {
			if (hasBailed) {
				// Exiting already
				return;
			}

			// Prevent new test files from running
			hasBailed = true;

			// Make sure we don't run the timeout handler
			timeoutTrigger.discard();

			runStatus.emitStateChange({type: 'interrupt'});

			for (const worker of pendingWorkers) {
				worker.exit();
			}
		};

		const {providers = []} = this.options;

		let testFiles;
		try {
			testFiles = await globs.findTests({cwd: this.options.projectDir, ...apiOptions.globs});
			if (typeof testFileSelector === 'function') {
				selectedFiles = testFileSelector(testFiles, selectedFiles);
			} else if (selectedFiles.length === 0) {
				selectedFiles = filter.length === 0
					? testFiles
					: globs.applyTestFileFilter({
						cwd: this.options.projectDir,
						filter: filter.map(({pattern}) => pattern),
						providers,
						testFiles,
					});
			}
		} catch (error) {
			selectedFiles = [];
			setupOrGlobError = error;
		}

		filter = selectedFiles.appliedFilters ?? filter;
		const selectionInsights = {
			filter,
			ignoredFilterPatternFiles: selectedFiles.ignoredFilterPatternFiles ?? [],
			testFileCount: testFiles.length,
			selectionCount: selectedFiles.length,
		};

		try {
			if (this.options.parallelRuns) {
				const {currentIndex, totalRuns} = this.options.parallelRuns;
				const fileCount = selectedFiles.length;

				// The files must be in the same order across all runs, so sort them.
				const defaultComparator = (a, b) => a.localeCompare(b, [], {numeric: true});
				selectedFiles = selectedFiles.toSorted(this.options.sortTestFiles ?? defaultComparator);
				selectedFiles = chunkd(selectedFiles, currentIndex, totalRuns);

				const currentFileCount = selectedFiles.length;

				runStatus = new RunStatus(fileCount, {currentFileCount, currentIndex, totalRuns}, selectionInsights);
			} else {
				// If a custom sorter was configured, use it.
				if (this.options.sortTestFiles) {
					selectedFiles = selectedFiles.toSorted(this.options.sortTestFiles);
				}

				runStatus = new RunStatus(selectedFiles.length, null, selectionInsights);
			}

			selectedFiles = scheduler.failingTestsFirst(selectedFiles, this.#getLocalCacheDir(), this.options.cacheEnabled);

			const isDebugWithoutSpecificFile = Boolean(this.options.debug) && !this.options.debug.active && selectedFiles.length !== 1;

			await this.emit('run', {
				bailWithoutReporting: isDebugWithoutSpecificFile,
				debug: Boolean(this.options.debug),
				failFastEnabled: isFailFast,
				filePathPrefix: getFilePathPrefix(selectedFiles),
				files: selectedFiles,
				matching: apiOptions.match.length > 0 || runtimeOptions.interactiveMatchPattern !== undefined,
				previousFailures: runtimeOptions.countPreviousFailures?.() ?? 0,
				firstRun: runtimeOptions.firstRun ?? true,
				status: runStatus,
			});

			if (setupOrGlobError) {
				throw setupOrGlobError;
			}

			// Bail out early when debugging and there is not a single specific test file to debug, or if no files were found.
			if (isDebugWithoutSpecificFile || selectedFiles.length === 0) {
				return runStatus;
			}

			runStatus.on('stateChange', ({data: record}) => {
				if (record.testFile && !timedOutWorkerFiles.has(record.testFile) && record.type !== 'worker-stderr' && record.type !== 'worker-stdout') {
					// Debounce the timer whenever there is test-related activity from workers that haven't already timed out.
					timeoutTrigger.debounce();
				}

				if (!(isFailFast && (record.type === 'hook-failed' || record.type === 'test-failed' || record.type === 'worker-failed'))) { // eslint-disable-line unicorn/prefer-includes-over-repeated-comparisons
					return;
				}

				// Prevent new test files from running once a test has failed.
				hasBailed = true;

				// Try to stop currently scheduled tests.
				for (const worker of pendingWorkers) {
					worker.notifyOfPeerFailure();
				}
			});

			const providerStates = [];
			await Promise.all(providers.map(async ({type, main, protocol}) => {
				const state = await main.compile({cacheDir: this.#createCacheDir(), files: testFiles});
				if (state !== null) {
					providerStates.push({type, state, protocol});
				}
			}));

			// Resolve the correct concurrency value. Note that `os.cpus()` can return empty arrays on
			// platforms not officially supported by Node.js. Use 1 as a minimum.
			// See <https://github.com/nodejs/node/issues/38190>.
			let concurrency = Math.max(1, os.cpus().length);
			if (apiOptions.serial) {
				concurrency = 1;
			} else if (apiOptions.concurrency > 0) {
				concurrency = apiOptions.concurrency;
			} else if (isCi) {
				concurrency = 2;
			}

			const deregisteredSharedWorkers = [];

			// Try and run each file, limited by `concurrency`.
			await pMap(selectedFiles, async file => {
				// No new files should be run once a test has timed out or failed,
				// and failFast is enabled.
				if (hasBailed) {
					return;
				}

				const lineNumbers = getApplicableLineNumbers(globs.normalizeFileForMatching(apiOptions.projectDir, file), filter);
				// Removing `providers` and `sortTestFiles` fields because they cannot be transferred to the worker threads.
				const {providers: _, sortTestFiles: __, match, ...forkOptions} = apiOptions;
				const options = {
					...forkOptions,
					providerStates,
					lineNumbers,
					recordNewSnapshots: !isCi,
					match: runtimeOptions.interactiveMatchPattern === undefined ? match : [...match, runtimeOptions.interactiveMatchPattern],
				};

				if (runtimeOptions.updateSnapshots) { // eslint-disable-line unicorn/no-immediate-mutation
					// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
					options.updateSnapshots = true;
				}

				const worker = fork(file, options, apiOptions.nodeArguments);
				worker.onStateChange(data => {
					if (data.type === 'test-timeout-configured' && !apiOptions.debug) {
						timeoutTrigger.ignoreFor(data.period);
					}
				});
				runStatus.observeWorker(worker, file, {selectingLines: lineNumbers.length > 0});
				deregisteredSharedWorkers.push(observeWorkerProcess(worker, runStatus));

				pendingWorkers.add(worker);
				worker.promise.then(() => {
					pendingWorkers.delete(worker);
				});
				timeoutTrigger.debounce();

				await worker.promise;
			}, {concurrency, stopOnError: false});

			// Allow shared workers to clean up before the run ends.
			await Promise.all(deregisteredSharedWorkers);
			const files = scheduler.storeFailedTestFiles(runStatus, this.options.cacheEnabled === false ? null : this.#createCacheDir());
			if (files) {
				runStatus.emitStateChange({type: 'touched-files', files});
			}
		} catch (error) {
			runStatus.emitStateChange({type: 'internal-error', err: serializeError(error)});
		}

		timeoutTrigger.discard();
		return runStatus.end();
	}
}
