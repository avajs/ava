const {Sema} = require('async-sema');
const nowAndTimers = require('../now-and-timers');
const TestPool = require('./test-pool');

const noop = () => {};

// SingleProcessTestPool runs tests in a single process
class SingleProcessTestPool extends TestPool {
	async run(files) {
		const sema = new Sema(1, {capacity: files.length});

		// Create promise to resolve when subprocess is ready to run a file
		let waitingFileResolve;
		const readyPromise = new Promise(resolve => {
			waitingFileResolve = resolve;
		});

		// Let subprocess know to run in singleProcess mode
		global.singleProcess = true;
		global.singleProcessIPC = {
			ref: noop,
			unref: noop,
			flush: noop,
			options: Promise.resolve(this.workerOptions),
			peerFailed: new Promise(noop),
			send: evt => {
				if (evt.type === 'waiting-file') {
					waitingFileResolve();
				}
			},
			newFile: callback => {
				this.testRunner = callback;
			}
		};

		// eslint-disable-next-line import/no-unassigned-import
		require('../worker/subprocess');

		// Try and run each file, one at a time.
		await readyPromise;
		await Promise.all(files.map(async file => {
			await sema.acquire();

			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			const worker = this._worker(file);
			this.runStatus.observeWorker(worker, file);

			this.pendingWorkers.add(worker);
			await worker.promise;
			this.pendingWorkers.delete(worker);
			this.restartTimer();

			await worker.promise;
			sema.release();
		}));
	}

	_worker(file) {
		let forcedExit;
		let testResolve;
		let testReject;

		const testPromise = new Promise((resolve, reject) => {
			testResolve = resolve;
			testReject = reject;
		});

		let peerFailResolve;
		global.singleProcessIPC.peerFailed = new Promise(resolve => {
			peerFailResolve = resolve;
		});

		const exit = () => {
			forcedExit = true;
			peerFailResolve();
			testResolve();
		};

		global.singleProcessIPC.send = evt => {
			if (evt.type === 'reached-exit') {
				if (evt.code) {
					statusListener({type: 'worker-failed', nonZeroExitCode: evt.code});
					testReject();
				} else {
					statusListener({type: 'worker-finished', forcedExit});
					testResolve();
				}
			}

			statusListener(evt);
		};

		let statusListener;
		const onStateChange = listener => {
			statusListener = evt => {
				listener(Object.assign(evt, {testFile: file}));
			};
		};

		nowAndTimers.setImmediate(() => {
			this.testRunner(file);
		});

		return {
			file,
			exit,
			onStateChange,
			promise: testPromise,
			notifyOfPeerFailure: peerFailResolve
		};
	}
}

module.exports = SingleProcessTestPool;
