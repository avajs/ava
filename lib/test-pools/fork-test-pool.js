const Bluebird = require('bluebird');
const Fork = require('../fork');
const TestPool = require('./test-pool');

// ForkTestPool runs tests in a new forked processes for each test
class ForkTestPool extends TestPool {
	run(files) {
		// Try and run each file, limited by `concurrency`.
		return Bluebird.map(files, file => {
			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			return this._computeForkExecArgv().then(execArgv => {
				const worker = new Fork(file, this.workerOptions, execArgv);
				this.runStatus.observeWorker(worker, file);

				this.pendingWorkers.add(worker);
				worker.promise.then(() => {
					this.pendingWorkers.delete(worker);
				});
				this.restartTimer();

				return worker.promise;
			});
		}, {concurrency: this.concurrency});
	}
}

module.exports = ForkTestPool;
