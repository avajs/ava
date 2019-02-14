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

	function exit(code) {
		if (!process.exitCode) {
			process.exitCode = code;
		}

		dependencyTracking.flush();
		return ipc.flush().then(() => process.exit()); // eslint-disable-line unicorn/no-process-exit
	}

	const runner = new Runner({
		failFast: options.failFast,
		failWithoutAssertions: options.failWithoutAssertions,
		file: options.file,
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
	process.on('unhandledRejection', (reason, promise) => {
		if (runner.attributeLeakedError(reason)) {
			attributedRejections.add(promise);
		}
	});

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

	process.on('uncaughtException', error => {
		if (runner.attributeLeakedError(error)) {
			return;
		}

		ipc.send({type: 'uncaught-exception', err: serializeError('Uncaught exception', true, error)});
		exit(1);
	});

	let accessedRunner = false;
	exports.getRunner = () => {
		accessedRunner = true;
		return runner;
	};

	// Store value in case to prevent required modules from modifying it.
	const testPath = options.file;

	// Install before processing options.require, so if helpers are added to the
	// require configuration the *compiled* helper will be loaded.
	dependencyTracking.install(testPath);
	precompilerHook.install();

	try {
		for (const mod of (options.require || [])) {
			const required = require(mod);

			try {
				if (required[Symbol.for('esm:package')] ||
						required[Symbol.for('esm\u200D:package')]) {
					require = required(module); // eslint-disable-line no-global-assign
				}
			} catch (_) {}
		}

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
}).catch(error => {
	// There shouldn't be any errors, but if there are we may not have managed
	// to bootstrap enough code to serialize them. Re-throw and let the process
	// crash.
	setImmediate(() => {
		throw error;
	});
});
