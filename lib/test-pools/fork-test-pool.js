const {Sema} = require('async-sema');
const TestPool = require('./test-pool');

// ForkTestPool runs tests in a new forked processes for each test
class ForkTestPool extends TestPool {
	async run(files) {
		const sema = new Sema(this.concurrency, {capacity: files.length});

		await Promise.all(files.map(async file => {
			await sema.acquire();
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
			sema.release();
		}));
	}
}

module.exports = ForkTestPool;
