'use strict';

// Check if the test is being run without AVA cli
{
	/* eslint-disable import/order */
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

/* eslint-enable import/order */
const Bluebird = require('bluebird');
const currentlyUnhandled = require('currently-unhandled')();
const isObj = require('is-obj');
const adapter = require('./process-adapter');
const globals = require('./globals');
const serializeError = require('./serialize-error');
const throwsHelper = require('./throws-helper');

const opts = adapter.opts;
const testPath = opts.file;
globals.options = opts;

// Bluebird specific
Bluebird.longStackTraces();

(opts.require || []).forEach(require);

adapter.installSourceMapSupport();
adapter.installPrecompilerHook();

const dependencies = [];
adapter.installDependencyTracking(dependencies, testPath);

// Check if test files required ava and show error, when they didn't
exports.avaRequired = false;

require(testPath); // eslint-disable-line import/no-dynamic-require

// If AVA was not required, show an error
if (!exports.avaRequired) {
	adapter.send('no-tests', {avaRequired: false});
}

process.on('unhandledRejection', throwsHelper);

process.on('uncaughtException', exception => {
	throwsHelper(exception);

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

	let rejections = currentlyUnhandled();

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
	// it flat out crashes.
	adapter.send('teardown', {dependencies});
});

process.on('ava-exit', () => {
	process.exit(0); // eslint-disable-line xo/no-process-exit
});
