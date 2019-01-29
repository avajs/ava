const getPort = require('get-port');

// This is the base TestPool, all Pool
// implementations should be based off of this file
class TestPool {
	constructor({
		api,
		runStatus,
		apiOptions,
		concurrency,
		restartTimer,
		failedWorkers,
		pendingWorkers,
		precompilation
	}) {
		this.api = api;
		this.runStatus = runStatus;
		this.apiOptions = apiOptions;
		this.concurrency = concurrency;
		this.restartTimer = restartTimer;
		this.failedWorkers = failedWorkers;
		this.pendingWorkers = pendingWorkers;
		this.precompilation = precompilation;
	}

	/**
	 * @param {string} files - the test files to run
	 * @param {Object} runtimeOptions - current runtimeOptions
	 */
	run() {
		throw new Error('not-implemented');
	}

	/**
   * Worker that is added to pendingWorkers, is not called externally
   * @returns {Object} worker - shared worker interface
   * @returns {string} worker.file - name of file run in worker
   * @returns {Promise} worker.promise - promise that resolve on worker finish
   * @returns {Function} worker.exit - function to exit worker
   * @returns {Function} worker.onStateChange - function called to add stateChange callback
   * @returns {Function} worker.notifyOfPeerFailure - function to try to stop currently scheduled tests.
   */
	_worker() {
		return {};
	}

	_computeForkExecArgv() {
		const execArgv = this.apiOptions.testOnlyExecArgv || process.execArgv;
		if (execArgv.length === 0) {
			return Promise.resolve(execArgv);
		}

		let debugArgIndex = -1;

		// --inspect-brk is used in addition to --inspect to break on first line and wait
		execArgv.some((arg, index) => {
			const isDebugArg = /^--inspect(-brk)?($|=)/.test(arg);
			if (isDebugArg) {
				debugArgIndex = index;
			}

			return isDebugArg;
		});

		const isInspect = debugArgIndex >= 0;
		if (!isInspect) {
			execArgv.some((arg, index) => {
				const isDebugArg = /^--debug(-brk)?($|=)/.test(arg);
				if (isDebugArg) {
					debugArgIndex = index;
				}

				return isDebugArg;
			});
		}

		if (debugArgIndex === -1) {
			return Promise.resolve(execArgv);
		}

		return getPort().then(port => {
			const forkExecArgv = execArgv.slice();
			let flagName = isInspect ? '--inspect' : '--debug';
			const oldValue = forkExecArgv[debugArgIndex];
			if (oldValue.indexOf('brk') > 0) {
				flagName += '-brk';
			}

			forkExecArgv[debugArgIndex] = `${flagName}=${port}`;

			return forkExecArgv;
		});
	}
}

module.exports = TestPool;
