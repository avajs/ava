'use strict';
const currentlyUnhandled = require('currently-unhandled')();

/* eslint-disable import/no-unassigned-import */
require('./ensure-forked');
require('./load-chalk');
require('./consume-argv');
/* eslint-enable import/no-unassigned-import */

const ipc = require('./ipc');

ipc.send({type: 'ready-for-options'});
ipc.options.then(options => {
	require('./options').set(options);
	require('./fake-tty'); // eslint-disable-line import/no-unassigned-import

	const nowAndTimers = require('../now-and-timers');
	const Runner = require('../runner');
	const serializeError = require('../serialize-error');
	const dependencyTracking = require('./dependency-tracker');
	const precompilerHook = require('./precompiler-hook');
	let revertGlobal = require('../revert-global');

	// When using shared forks don't exit after test finishes
	let preventExit = false;
	let unhandledRejectionHandler;
	let uncaughtExceptionHandler;

	function exit(code) {
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

		ipc.flush().then(() => process.exit()); // eslint-disable-line unicorn/no-process-exit
	}

	// Store value in case to prevent required modules from modifying it.
	const testPath = options.file;

	// Install before processing options.require, so if helpers are added to the
	// require configuration the *compiled* helper will be loaded.
	dependencyTracking.install(testPath);
	precompilerHook.install();

	for (const mod of (options.require || [])) {
		const required = require(mod);

		try {
			if (required[Symbol.for('esm\u200D:package')]) {
				require = required(module); // eslint-disable-line no-global-assign
			}
		} catch (_) {}
	}

	// Initialize revert after custom requires
	revertGlobal = revertGlobal();

	const runFile = file => {
		const testPath = file;

		// Remove any global variables left over from previous test
		revertGlobal();

		const runner = new Runner({
			file,
			failFast: options.failFast,
			failWithoutAssertions: options.failWithoutAssertions,
			match: options.match,
			projectDir: options.projectDir,
			runOnlyExclusive: options.runOnlyExclusive,
			serial: options.serial,
			snapshotDir: options.snapshotDir,
			updateSnapshots: options.updateSnapshots
		});

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
		global.getRunner = () => {
			accessedRunner = true;
			return runner;
		};

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
		// Use no-op to keep process alive
		setInterval(() => {}, 10000);
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
