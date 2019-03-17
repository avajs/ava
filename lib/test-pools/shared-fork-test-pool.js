const Bluebird = require('bluebird');
const TestPool = require('./test-pool');

// SharedForkTestPool runs tests in shared forked processes
class SharedForkTestPool extends TestPool {
	run(files) {
		// Create forks array to store shared forks
		this.forks = [];

		return Bluebird.map(files, file => {
			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			let worker;

			return new Promise(resolve => {
				if (this.forks.length > 0) {
					worker = this.forks.shift();
					return resolve();
				}

				// Initialize a fork since one wasn't available
				this._computeForkExecArgv().then(execArg => {
					const fork = new this.api.Fork(undefined, this.workerOptions, execArg);
					fork.promise.then(() => {
						worker = fork;
						resolve();
					});
				});
			}).then(() => {
				let listener;
				this.runStatus.observeWorker({
					onStateChange: _listener => {
						listener = _listener;
					}
				}, file);

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
			});
		}, {concurrency: this.concurrency})
			.then(() => {
				for (const fork of this.forks) {
					fork.exit();
				}
			});
	}
}

module.exports = SharedForkTestPool;
