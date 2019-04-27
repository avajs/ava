const Bluebird = require('bluebird');
const TestPool = require('./test-pool');

// SharedForkTestPool runs tests in shared forked processes
class SharedForkTestPool extends TestPool {
	async run(files) {
		// Clear bluebird in case tests use it
		delete require.cache[require.resolve('bluebird')];
		// Create forks array to store shared forks
		this.forks = [];

		await Bluebird.map(files, async file => {
			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			let worker;

			if (this.forks.length > 0) {
				worker = this.forks.shift();
			} else {
				const execArg = await this._computeForkExecArgv();
				const fork = new this.api.Fork(undefined, this.workerOptions, execArg);
				await fork.promise;
				worker = fork;
			}

			let listener;
			this.runStatus.observeWorker({
				onStateChange: _listener => {
					listener = _listener;
				}
			}, file);

			worker.onStateChange(listener);
			worker.newFile(file);

			this.pendingWorkers.add(worker);
			await worker.promise;
			worker.offStateChange(listener);
			this.forks.push(worker);
			this.pendingWorkers.delete(worker);
			this.restartTimer();

			await worker.promise;
		}, {concurrency: this.concurrency});

		for (const fork of this.forks) {
			fork.exit();
		}
	}
}

module.exports = SharedForkTestPool;
