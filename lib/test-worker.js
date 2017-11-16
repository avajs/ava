'use strict';

// Check if the test is being run without AVA cli
{
	const path = require('path');
	const chalk = require('chalk');

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
const globals = require('./globals');

const opts = adapter.opts;
globals.options = opts;

const serializeError = require('./serialize-error');

(opts.require || []).forEach(x => require(x));

adapter.installSourceMapSupport();
adapter.installPrecompilerHook();

const testPath = opts.file;

const dependencies = new Set();
adapter.installDependencyTracking(dependencies, testPath);

const touchedFiles = new Set();

// Set when main.js is required (since test files should have `require('ava')`).
let runner = null;
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
};

require(testPath);

// If AVA was not required, show an error
if (!runner) {
	adapter.send('no-tests', {avaRequired: false});
}

function attributeLeakedError(err) {
	if (!runner) {
		return false;
	}

	return runner.attributeLeakedError(err);
}

const attributedRejections = new Set();
process.on('unhandledRejection', (reason, promise) => {
	if (attributeLeakedError(reason)) {
		attributedRejections.add(promise);
	}
});

process.on('uncaughtException', exception => {
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

	// Ensure the IPC channel is refereced. The uncaught exception will kick off
	// the teardown sequence, for which the messages must be received.
	adapter.ipcChannel.ref();

	adapter.send('uncaughtException', {exception: serialized});
});

let tearingDown = false;
process.on('ava-teardown', () => {
	// AVA-teardown can be sent more than once
	if (tearingDown) {
		return;
	}
	tearingDown = true;

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
