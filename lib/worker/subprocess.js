'use strict';
const currentlyUnhandled = require('currently-unhandled')();

/* eslint-disable unicorn/no-process-exit */
/* eslint-disable import/no-unassigned-import */
require('./ensure-forked');
require('./load-chalk');
require('./consume-argv');
require('./fake-tty');

const Runner = require('../runner');
const serializeError = require('../serialize-error');
const dependencyTracking = require('./dependency-tracker');
const ipc = require('./ipc');
const options = require('./options').get();
const precompilerHook = require('./precompiler-hook');

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

let accessedRunner = false;
exports.getRunner = () => {
	accessedRunner = true;
	return runner;
};

runner.on('dependency', dependencyTracking.track);

const touchedFiles = new Set();
runner.on('touched', files => {
	for (const file of files) {
		touchedFiles.add(file);
	}
});

runner.on('start', started => {
	ipc.send('stats', {
		testCount: started.stats.testCount,
		hasExclusive: started.stats.hasExclusive
	});

	for (const partial of started.skippedTests) {
		ipc.send('test', {
			duration: null,
			error: null,
			failing: partial.failing,
			logs: [],
			skip: true,
			title: partial.title,
			todo: false,
			type: 'test'
		});
	}
	for (const title of started.todoTitles) {
		ipc.send('test', {
			duration: null,
			error: null,
			failing: false,
			logs: [],
			skip: true,
			title,
			todo: true,
			type: 'test'
		});
	}

	started.ended.then(() => {
		runner.saveSnapshotState();
		return exit();
	}).catch(err => {
		handleUncaughtException(err);
	});
});

runner.on('hook-failed', result => {
	ipc.send('test', {
		duration: result.duration,
		error: serializeError('Hook failure', true, result.error),
		failing: result.metadata.failing,
		logs: result.logs,
		skip: result.metadata.skip,
		title: result.title,
		todo: result.metadata.todo,
		type: result.metadata.type
	});
});

runner.on('test', result => {
	ipc.send('test', {
		duration: result.duration,
		error: result.passed ? null : serializeError('Test failure', true, result.error),
		failing: result.metadata.failing,
		logs: result.logs,
		skip: result.metadata.skip,
		title: result.title,
		todo: result.metadata.todo,
		type: result.metadata.type
	});
});

// Track when exiting begins, to avoid repeatedly sending stats, or sending
// individual test results once stats have been sent. This is necessary since
// exit() can be invoked from the worker process and over IPC.
let exiting = false;
function exit() {
	if (exiting) {
		return;
	}
	exiting = true;

	// Reference the IPC channel so the exit sequence can be completed.
	ipc.forceRefChannel();

	const stats = {
		failCount: runner.stats.failCount + runner.stats.failedHookCount,
		knownFailureCount: runner.stats.knownFailureCount,
		passCount: runner.stats.passCount,
		skipCount: runner.stats.skipCount,
		testCount: runner.stats.testCount,
		todoCount: runner.stats.todoCount
	};
	ipc.send('results', {stats});
}

function handleUncaughtException(exception) {
	if (runner.attributeLeakedError(exception)) {
		return;
	}

	// Ensure the IPC channel is referenced. The uncaught exception will kick off
	// the teardown sequence, for which the messages must be received.
	ipc.forceRefChannel();

	ipc.send('uncaughtException', {exception: serializeError('Uncaught exception', true, exception)});
}

const attributedRejections = new Set();
process.on('unhandledRejection', (reason, promise) => {
	if (runner.attributeLeakedError(reason)) {
		attributedRejections.add(promise);
	}
});

process.on('uncaughtException', handleUncaughtException);

let tearingDown = false;
process.on('ava-teardown', () => {
	// AVA-teardown can be sent more than once
	if (tearingDown) {
		return;
	}
	tearingDown = true;

	// Reference the IPC channel so the teardown sequence can be completed.
	ipc.forceRefChannel();

	const rejections = currentlyUnhandled().filter(rejection => !attributedRejections.has(rejection.promise));
	if (rejections.length > 0) {
		ipc.send('unhandledRejections', {
			rejections: rejections.map(rejection => serializeError('Unhandled rejection', true, rejection.reason))
		});
	}

	// Include dependencies in the final teardown message. This ensures the full
	// set of dependencies is included no matter how the process exits, unless
	// it flat out crashes. Also include any files that AVA touched during the
	// test run. This allows the watcher to ignore modifications to those files.
	ipc.send('teardown', {
		dependencies: dependencyTracking.getAll(),
		touchedFiles: Array.from(touchedFiles)
	});
});

process.on('ava-exit', () => {
	process.exit(0); // eslint-disable-line xo/no-process-exit
});

process.on('ava-init-exit', () => {
	exit();
});

process.on('ava-peer-failed', () => {
	runner.interrupt();
});

// Store value in case to prevent required modules from modifying it.
const testPath = options.file;

// Install before processing options.require, so if helpers are added to the
// require configuration the *compiled* helper will be loaded.
dependencyTracking.install(testPath);
precompilerHook.install();

try {
	(options.require || []).forEach(x => {
		const required = require(x);

		try {
			if (required[Symbol.for('esm\u200D:package')]) {
				require = required(module); // eslint-disable-line no-global-assign
			}
		} catch (_) {}
	});

	require(testPath);
} catch (err) {
	handleUncaughtException(err);
} finally {
	ipc.send('loaded-file', {avaRequired: accessedRunner});

	if (accessedRunner) {
		// Unreference the IPC channel if the test file required AVA. This stops it
		// from keeping the event loop busy, which means the `beforeExit` event can be
		// used to detect when tests stall.
		// If AVA was not required then the parent process will initiated a teardown
		// sequence, for which this process ought to stay active.
		ipc.unrefChannel();
	}
}
