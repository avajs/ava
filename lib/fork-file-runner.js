'use strict';
const Bluebird = require('bluebird');
const fork = require('./fork');

// Runs each test file in a new forked Node process.
// This is the default file runner.
module.exports = (options, runStatus) => {
	const {files, concurrency, babelState, apiOptions, timeoutKeepAlive} = options;

	const pendingWorkers = new Set();
	const timedOutWorkerFiles = new Set();

	runStatus.on('stateChange', ({type, testFile}) => {
		switch (type) {
			// A timeout has happened, stop all forks and mark them as timed out
			case 'timeout':
				for (const worker of pendingWorkers) {
					timedOutWorkerFiles.add(worker.file);
					worker.exit();
				}

				break;
			// SIGINT, stop all running forks
			case 'interrupt':
				for (const worker of pendingWorkers) {
					worker.exit();
				}

				break;
			// We've bailed early, such as --fail-fast, notify the running forks that this has happened
			case 'bailed':
				// Try to stop currently scheduled tests.
				for (const worker of pendingWorkers) {
					worker.notifyOfPeerFailure();
				}

				break;
			default:
				break;
		}

		if (testFile && !timedOutWorkerFiles.has(testFile)) {
			// Restart the timer whenever there is activity from workers that
			// haven't already timed out.
			timeoutKeepAlive();
		}
	});

	return Bluebird.map(files, async file => {
		// No new files should be run once a test has timed out or failed,
		// and failFast is enabled.
		if (runStatus.bailed) {
			return;
		}

		const forkOptions = {
			...apiOptions,
			babelState,
			recordNewSnapshots: options.recordNewSnapshots,
			runOnlyExclusive: options.runOnlyExclusive,
			updateSnapshots: options.updateSnapshots
		};

		const worker = fork(file, forkOptions, process.execArgv);
		runStatus.observeWorker(worker, file);
		pendingWorkers.add(worker);
		timeoutKeepAlive();
		const result = await worker.promise;
		pendingWorkers.delete(worker);
		return result;
	}, {concurrency});
};
