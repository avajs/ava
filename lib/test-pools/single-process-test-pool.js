const currentlyUnhandled = require('currently-unhandled')();
const Bluebird = require('bluebird');
const Runner = require('../runner');
const nowAndTimers = require('../now-and-timers');
const serializeError = require('../serialize-error');
let revertGlobal = require('../revert-global');
const precompilerHook = require('../worker/precompiler-hook');
const TestPool = require('./test-pool');

// SingleProcessTestPool runs tests in a single process
class SingleProcessTestPool extends TestPool {
	run(files) {
		precompilerHook.install(this.workerOptions);

		// Load any custom requires
		/* istanbul ignore next */
		for (const mod of (this.apiOptions.require || [])) {
			const required = require(mod);

			try {
				if (required[Symbol.for('esm\u200D:package')]) {
					require = required(module); // eslint-disable-line no-global-assign
				}
			} catch (_) {}
		}

		// Setup revert global after requiring custom requires so that
		// we don't clear any globals needed in testing
		revertGlobal = revertGlobal();

		// Try and run each file, one at a time.
		return Bluebird.map(files, file => {
			// No new files should be run once a test has timed out or failed,
			// and failFast is enabled.
			if (this.api.bailed) {
				return;
			}

			const worker = this._worker(file, this.workerOptions);
			this.runStatus.observeWorker(worker, file);

			this.pendingWorkers.add(worker);
			worker.promise.then(() => {
				this.pendingWorkers.delete(worker);
			});
			this.restartTimer();

			return worker.promise;
		}, {concurrency: 1});
	}

	_worker(file, options) {
		// Clear any global variables from previous test
		revertGlobal();

		const runner = new Runner({
			file,
			scheduledStart: true,
			failFast: options.failFast,
			failWithoutAssertions: options.failWithoutAssertions,
			match: options.match,
			projectDir: options.projectDir,
			runOnlyExclusive: options.runOnlyExclusive,
			serial: options.serial,
			snapshotDir: options.snapshotDir,
			updateSnapshots: options.updateSnapshots
		});

		let _reject;
		let _resolve;

		// Create promise to signify when test is finished
		const promise = new Promise((resolve, reject) => {
			_resolve = resolve;
			_reject = reject;
		});

		// Map exit to resolve or reject
		const exit = code => {
			process.removeListener('unhandledRejection', unhandledRejectionHandler);
			runner.interrupt();
			if (code && options.failFast) {
				_reject();
			} else {
				_resolve();
			}
		};

		let statusListener;
		const onStateChange = listener => {
			statusListener = evt => {
				evt.testFile = file;
				listener(evt);
			};

			return runner.on('stateChange', statusListener);
		};

		const notifyOfPeerFailure = () => {
			runner.interrupt();
		};

		const attributedRejections = new Set();
		const unhandledRejectionHandler = (reason, promise) => {
			if (runner.attributeLeakedError(reason)) {
				attributedRejections.add(promise);
			}
		};

		process.on('unhandledRejection', unhandledRejectionHandler);

		runner.on('error', error => {
			statusListener({type: 'internal-error', err: serializeError('Internal runner error', false, error)});
			exit(1);
		});

		/* istanbul ignore next */
		runner.on('finish', () => {
			try {
				const touchedFiles = runner.saveSnapshotState();
				if (touchedFiles) {
					statusListener({type: 'touched-files', files: touchedFiles});
				}
			} catch (error) {
				statusListener({type: 'internal-error', err: serializeError('Internal runner error', false, error)});
				exit(1);
				return;
			}

			/* istanbul ignore next */
			nowAndTimers.setImmediate(() => {
				currentlyUnhandled()
					.filter(rejection => !attributedRejections.has(rejection.promise))
					.forEach(rejection => {
						statusListener({type: 'unhandled-rejection', err: serializeError('Unhandled rejection', true, rejection.reason)});
					});

				exit(0);
			});
		});

		let accessedRunner = false;
		global.getRunner = () => {
			accessedRunner = true;
			return runner;
		};

		// Store value in case to prevent required modules from modifying it.
		const testPath = file;

		// Give runStatus a chance to setup listener
		nowAndTimers.setImmediate(() => {
			try {
				require(testPath);
				// Emit dependencies
				const {children} = require.cache[file] || {};
				if (children) {
					const dependencies = children.map(mod => mod.id);
					statusListener({type: 'dependencies', dependencies});
				}
			} catch (error) {
				statusListener({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error)});
				exit(1);
			}

			if (accessedRunner) {
				runner.start();
			} else {
				statusListener({type: 'missing-ava-import'});
				exit(1);
			}
		});

		return {
			file,
			exit,
			promise,
			onStateChange,
			notifyOfPeerFailure
		};
	}
}

module.exports = SingleProcessTestPool;
