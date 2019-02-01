const Bluebird = require('bluebird');
const debug = require('debug')('ava:pool');
const TestPool = require('./test-pool');

// SharedForkTestPool runs tests in shared forked processes
class SharedForkTestPool extends TestPool {
	run(files) {
		// Create forks array to store shared forks
		this.forks = [];
		// Store initial promises that are resolved when ready
		this.forkPromises = [];

		for (let i = 0; (i < this.concurrency && i < files.length); i++) {
			this.forkPromises.push(new Promise(resolve => {
				this.forks.push(this._computeForkExecArgv().then(execArg => {
					this.forks[i] = new this.api.Fork(undefined, this.workerOptions, execArg);
					this.forks[i].promise.then(() => resolve());
				}));
			}));
		}

		debug('using ' + this.forks.length + ' forks, for ' + files.length + ' files');

		// Wait for forks to be initialized
		return Bluebird.all(this.forkPromises).then(() => {
			return Bluebird.map(files, file => {
				// No new files should be run once a test has timed out or failed,
				// and failFast is enabled.
				if (this.api.bailed) {
					return;
				}

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
