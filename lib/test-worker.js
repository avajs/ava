'use strict';

// Check if the test is being run without AVA cli
{
	const path = require('path');
	const chalk = require('chalk'); // This processes the --color/--no-color argument passed by fork.js

	const isForked = typeof process.send === 'function';
	if (!isForked) {
		const fp = path.relative('.', process.argv[1]);

		console.log();
		console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	}
}

const currentlyUnhandled = require('currently-unhandled')();
const isObj = require('is-obj');

const adapter = require('./process-adapter');
const serializeError = require('./serialize-error');
const opts = require('./worker-options').get();

// Store details about the test run, to be sent to the parent process later.
const dependencies = new Set();
const touchedFiles = new Set();

// Set when main.js is required (since test files should have `require('ava')`).
let runner = null;

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
	adapter.forceRefChannel();

	const stats = {
		failCount: runner.stats.failCount + runner.stats.failedHookCount,
		knownFailureCount: runner.stats.knownFailureCount,
		passCount: runner.stats.passCount,
		skipCount: runner.stats.skipCount,
		testCount: runner.stats.testCount,
		todoCount: runner.stats.todoCount
	};
	adapter.send('results', {stats});
}

exports.setRunner = newRunner => {
	runner = newRunner;
	runner.on('dependency', file => {
		dependencies.add(file);
	});
	runner.on('touched', files => {
		for (const file of files) {
			touchedFiles.add(file);
		}
	});
	runner.on('start', started => {
		adapter.send('stats', {
			testCount: started.stats.testCount,
			hasExclusive: started.stats.hasExclusive
		});

		for (const partial of started.skippedTests) {
			adapter.send('test', {
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
			adapter.send('test', {
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
		adapter.send('test', {
			duration: result.duration,
			error: serializeError(result.error),
			failing: result.metadata.failing,
			logs: result.logs,
			skip: result.metadata.skip,
			title: result.title,
			todo: result.metadata.todo,
			type: result.metadata.type
		});
	});
	runner.on('test', result => {
		adapter.send('test', {
			duration: result.duration,
			error: result.passed ? null : serializeError(result.error),
			failing: result.metadata.failing,
			logs: result.logs,
			skip: result.metadata.skip,
			title: result.title,
			todo: result.metadata.todo,
			type: result.metadata.type
		});
	});
};

function attributeLeakedError(err) {
	if (!runner) {
		return false;
	}

	return runner.attributeLeakedError(err);
}

function handleUncaughtException(exception) {
	if (attributeLeakedError(exception)) {
		return;
	}

	let serialized;
	try {
		serialized = serializeError(exception);
	} catch (ignore) { // eslint-disable-line unicorn/catch-error-name
		// Avoid using serializeError
		const err = new Error('Failed to serialize uncaught exception');
		serialized = {
			avaAssertionError: false,
			name: err.name,
			message: err.message,
			stack: err.stack
		};
	}

	// Ensure the IPC channel is referenced. The uncaught exception will kick off
	// the teardown sequence, for which the messages must be received.
	adapter.forceRefChannel();

	adapter.send('uncaughtException', {exception: serialized});
}

const attributedRejections = new Set();
process.on('unhandledRejection', (reason, promise) => {
	if (attributeLeakedError(reason)) {
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
	adapter.forceRefChannel();

	let rejections = currentlyUnhandled()
		.filter(rejection => !attributedRejections.has(rejection.promise));

	if (rejections.length > 0) {
		rejections = rejections.map(rejection => {
			let reason = rejection.reason;
			if (!isObj(reason) || typeof reason.message !== 'string') {
				reason = {
					message: String(reason)
				};
			}
			return serializeError(reason);
		});

		adapter.send('unhandledRejections', {rejections});
	}

	// Include dependencies in the final teardown message. This ensures the full
	// set of dependencies is included no matter how the process exits, unless
	// it flat out crashes. Also include any files that AVA touched during the
	// test run. This allows the watcher to ignore modifications to those files.
	adapter.send('teardown', {
		dependencies: Array.from(dependencies),
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
	if (runner) {
		runner.interrupt();
	}
});

// Store value in case to prevent required modules from modifying it.
const testPath = opts.file;

// Install before processing opts.require, so if helpers are added to the
// require configuration the *compiled* helper will be loaded.
adapter.installDependencyTracking(dependencies, testPath);
adapter.installSourceMapSupport();
adapter.installPrecompilerHook();

try {
	(opts.require || []).forEach(x => {
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
	adapter.send('loaded-file', {avaRequired: Boolean(runner)});

	if (runner) {
		// Unreference the IPC channel if the test file required AVA. This stops it
		// from keeping the event loop busy, which means the `beforeExit` event can be
		// used to detect when tests stall.
		// If AVA was not required then the parent process will initiated a teardown
		// sequence, for which this process ought to stay active.
		adapter.unrefChannel();
	}
}
