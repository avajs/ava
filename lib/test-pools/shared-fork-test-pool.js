const {Sema} = require('async-sema');
const TestPool = require('./test-pool');

// SharedForkTestPool runs tests in shared forked processes
class SharedForkTestPool extends TestPool {
	async run(files) {
		// Create forks array to store shared forks
		this.forks = [];
		const sema = new Sema(this.concurrency, {capacity: files.length});

		await Promise.all(files.map(async file => {
			await sema.acquire();
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
			sema.release();
		}));

		for (const fork of this.forks) {
			fork.exit();
		}
	}
}

module.exports = SharedForkTestPool;
