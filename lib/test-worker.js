'use strict';
/* eslint-disable import/order */
const process = require('./process-adapter');

const opts = process.opts;
const testPath = opts.file;

// Bind globals first before anything has a chance to interfere
const globals = require('./globals');
globals.options = opts;
const Promise = require('bluebird');

// Bluebird specific
Promise.longStackTraces();

(opts.require || []).forEach(require);

process.installSourceMapSupport();

const currentlyUnhandled = require('currently-unhandled')();
const serializeError = require('./serialize-error');
const send = process.send;
const throwsHelper = require('./throws-helper');

// Check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.installPrecompilerHook();

const dependencies = [];
process.installDependencyTracking(dependencies, testPath);

require(testPath); // eslint-disable-line import/no-dynamic-require

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
			name: err.name,
			message: err.message,
			stack: err.stack
		};
	}
	send('uncaughtException', {exception: serialized});
});

// If AVA was not required, show an error
if (!exports.avaRequired) {
	send('no-tests', {avaRequired: false});
}

// Parse and re-emit AVA messages
process.on('message', message => {
	if (!message.ava) {
		return;
	}

	process.emit(message.name, message.data);
});

process.on('ava-exit', () => {
	// Use a little delay when running on AppVeyor (because it's shit)
	const delay = process.env.AVA_APPVEYOR ? 100 : 0;

	globals.setTimeout(() => {
		process.exit(0); // eslint-disable-line xo/no-process-exit
	}, delay);
});

let tearingDown = false;
process.on('ava-teardown', () => {
	// AVA-teardown can be sent more than once
	if (tearingDown) {
		return;
	}
	tearingDown = true;

	let rejections = currentlyUnhandled();

	if (rejections.length === 0) {
		exit();
		return;
	}

	rejections = rejections.map(rejection => {
		return serializeError(rejection.reason);
	});

	send('unhandledRejections', {rejections});
	globals.setTimeout(exit, 100);
});

function exit() {
	// Include dependencies in the final teardown message. This ensures the full
	// set of dependencies is included no matter how the process exits, unless
	// it flat out crashes.
	send('teardown', {dependencies});
}
