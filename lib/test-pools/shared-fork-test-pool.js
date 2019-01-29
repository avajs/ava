const Bluebird = require('bluebird');
const debug = require('debug')('ava:pool');
const Fork = require('../fork');
const TestPool = require('./test-pool');

// SharedForkTestPool runs tests in shared forked processes
class SharedForkTestPool extends TestPool {
	run(files, runtimeOptions = {}) {
		// Initialize options
		const options = Object.assign({}, this.apiOptions, {
			// If we're looking for matches, run every single test process in exclusive-only mode
			runOnlyExclusive: this.apiOptions.match.length > 0 || runtimeOptions.runOnlyExclusive === true
		});
		if (this.precompilation) {
			options.cacheDir = this.precompilation.cacheDir;
			options.precompiled = this.precompilation.map;
		} else {
			options.precompiled = {};
		}

		if (runtimeOptions.updateSnapshots) {
			// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
			options.updateSnapshots = true;
		}

		// Create forks array to store shared forks
		this.forks = [];
		// Store initial promises that are resolved when ready
		this.forkPromises = [];

		for (let i = 0; (i < this.concurrency && i < files.length); i++) {
			this.forkPromises.push(new Promise(resolve => {
				this.forks.push(this._computeForkExecArgv().then(execArg => {
					this.forks[i] = new Fork(undefined, options, execArg);
					this.forks[i].promise.then(() => resolve());
				}));
			}));
		}

		debug('using ' + this.forks.length + ' forks, for ' + files.length + ' files');

		// Wait for forks to be initialized
		return Bluebird.all(this.forkPromises).then(() => {
			return Bluebird.map(files, file => {
				let listener;
				this.runStatus.observeWorker({
					onStateChange: _listener => {
						listener = _listener;
					}
				}, file);

				const worker = this.forks.shift();
				worker.onStateChange(listener);
				worker.newFile(file);

				this.pendingWorkers.add(worker);
				worker.promise.then(() => {
					worker.offStateChange(listener);
					this.forks.push(worker);
					this.pendingWorkers.delete(worker);
				});
				this.restartTimer();

				return worker.promise;
			}, {concurrency: this.concurrency})
				.then(() => {
					for (const fork of this.forks) {
						fork.exit();
					}
				});
		});
	}
}

module.exports = SharedForkTestPool;
