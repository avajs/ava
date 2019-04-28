'use strict';
const currentlyUnhandled = require('currently-unhandled')();

/* eslint-disable import/no-unassigned-import */
if (!global.singleProcess) {
	require('./ensure-forked');
	require('./load-chalk');
	require('./consume-argv');
}
/* eslint-enable import/no-unassigned-import */

const ipc = global.singleProcessIPC || require('./ipc');

ipc.send({type: 'ready-for-options'});
ipc.options.then(options => {
	if (!global.singleProcess) {
		require('./fake-tty')(options);
	}

	const nowAndTimers = require('../now-and-timers');
	const Runner = require('../runner');
	const serializeError = require('../serialize-error');
	const dependencyTracking = require('./dependency-tracker');
	const precompilerHook = require('./precompiler-hook');
	const initRevertGlobal = require('../revert-global');

	// Install before processing options.require, so if helpers are added to the
	// require configuration the *compiled* helper will be loaded.
	dependencyTracking.install(options.file);
	precompilerHook.install(options);

	// When using shared forks don't exit after test finishes
	let revertGlobal;
	let preventExit = false;
	let unhandledRejectionHandler;
	let uncaughtExceptionHandler;

	async function exit(code) {
		dependencyTracking.flush();
		dependencyTracking.reset();

		if (preventExit) {
			process.removeListener('uncaughtException', uncaughtExceptionHandler);
			process.removeListener('unhandledRejection', unhandledRejectionHandler);
			return ipc.send({type: 'reached-exit', code});
		}

		if (!process.exitCode) {
			process.exitCode = code;
		}

		await ipc.flush();
		process.exit(); // eslint-disable-line unicorn/no-process-exit
	}

	const doRevertGlobal = () => {
		if (revertGlobal) {
			revertGlobal();
		} else {
			revertGlobal = initRevertGlobal();
		}
	};

	const runFile = file => {
		const testPath = file;

		if (!options.cacheRequire || !revertGlobal) {
			// Setup revertGlobal before requiring so it is not cached
			if (!options.cacheRequire) {
				doRevertGlobal();
			}

			for (const mod of (options.require || [])) {
				const required = require(mod);

				try {
					if (required[Symbol.for('esm:package')] ||
							required[Symbol.for('esm\u200D:package')]) {
						require = required(module); // eslint-disable-line no-global-assign
					}
				} catch (_) {}
			}
		}

		// Setup revertGlobal after requiring if cacheRequire is enabled
		if (options.cacheRequire) {
			doRevertGlobal();
		}

		const runner = new Runner({
			file,
			failFast: options.failFast,
			failWithoutAssertions: options.failWithoutAssertions,
			match: options.match,
			projectDir: options.projectDir,
			recordNewSnapshots: options.recordNewSnapshots,
			runOnlyExclusive: options.runOnlyExclusive,
			serial: options.serial,
			snapshotDir: options.snapshotDir,
			updateSnapshots: options.updateSnapshots
		});

		/* eslint-disable-next-line promise/prefer-await-to-then */
		ipc.peerFailed.then(() => {
			runner.interrupt();
		});

		const attributedRejections = new Set();
		unhandledRejectionHandler = (reason, promise) => {
			if (runner.attributeLeakedError(reason)) {
				attributedRejections.add(promise);
			}
		};

		process.on('unhandledRejection', unhandledRejectionHandler);

		runner.on('dependency', dependencyTracking.track);
		runner.on('stateChange', state => ipc.send(state));

		runner.on('error', error => {
			ipc.send({type: 'internal-error', err: serializeError('Internal runner error', false, error)});
			exit(1);
		});

		runner.on('finish', () => {
			try {
				const touchedFiles = runner.saveSnapshotState();
				if (touchedFiles) {
					ipc.send({type: 'touched-files', files: touchedFiles});
				}
			} catch (error) {
				ipc.send({type: 'internal-error', err: serializeError('Internal runner error', false, error)});
				exit(1);
				return;
			}

			nowAndTimers.setImmediate(() => {
				currentlyUnhandled()
					.filter(rejection => !attributedRejections.has(rejection.promise))
					.forEach(rejection => {
						ipc.send({type: 'unhandled-rejection', err: serializeError('Unhandled rejection', true, rejection.reason)});
					});
				exit(0);
			});
		});

		uncaughtExceptionHandler = error => {
			if (runner.attributeLeakedError(error)) {
				return;
			}

			ipc.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error)});
			exit(1);
		};

		process.on('uncaughtException', uncaughtExceptionHandler);

		let accessedRunner = false;
		exports.getRunner = () => {
			accessedRunner = true;
			return runner;
		};

		// Exports.getRunner fails with esm in SingleProcess so use global
		if (global.singleProcess) {
			global.getRunner = exports.getRunner;
		}

		try {
			require(testPath);

			if (accessedRunner) {
				// Unreference the IPC channel if the test file required AVA. This stops it
				// from keeping the event loop busy, which means the `beforeExit` event can be
				// used to detect when tests stall.
				ipc.unref();
			} else {
				ipc.send({type: 'missing-ava-import'});
				exit(1);
			}
		} catch (error) {
			ipc.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error)});
			exit(1);
		}
	};

	if (options.file) {
		runFile(options.file);
	} else {
		preventExit = true;
		ipc.newFile(runFile);
		if (!global.singleProcess) {
			// Use no-op to keep process alive
			setInterval(() => {}, 10000);
		}

		ipc.send({type: 'waiting-file'});
	}
}).catch(error => {
	// There shouldn't be any errors, but if there are we may not have managed
	// to bootstrap enough code to serialize them. Re-throw and let the process
	// crash.
	setImmediate(() => {
		throw error;
	});
});
