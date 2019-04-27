const Bluebird = require('bluebird');
const TestPool = require('./test-pool');

// ForkTestPool runs tests in a new forked processes for each test
class ForkTestPool extends TestPool {
	run(files) {
		return Bluebird.map(files, async file => {
			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			const execArgv = await this._computeForkExecArgv();
			const worker = new this.api.Fork(file, this.workerOptions, execArgv);
			this.runStatus.observeWorker(worker, file);

			this.pendingWorkers.add(worker);
			this.restartTimer();

			await worker.promise;
			this.pendingWorkers.delete(worker);
		}, {concurrency: this.concurrency});
	}
}

module.exports = ForkTestPool;
