'use strict';
/* eslint-disable import/order */
var process = require('./process-adapter');

var opts = process.opts;
var testPath = opts.file;

// bind globals first before anything has a chance to interfere
var globals = require('./globals');
globals.options = opts;
var Promise = require('bluebird');

// Bluebird specific
Promise.longStackTraces();

(opts.require || []).forEach(require);

process.installSourceMapSupport();

var currentlyUnhandled = require('currently-unhandled')();
var serializeError = require('./serialize-error');
var send = process.send;
var throwsHelper = require('./throws-helper');

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

process.installPrecompilerHook();

var dependencies = [];
process.installDependencyTracking(dependencies, testPath);

require(testPath); // eslint-disable-line import/no-dynamic-require

process.on('unhandledRejection', throwsHelper);

process.on('uncaughtException', function (exception) {
	throwsHelper(exception);
	send('uncaughtException', {exception: serializeError(exception)});
});

// if ava was not required, show an error
if (!exports.avaRequired) {
	send('no-tests', {avaRequired: false});
}

// parse and re-emit ava messages
process.on('message', function (message) {
	if (!message.ava) {
		return;
	}

	process.emit(message.name, message.data);
});

process.on('ava-exit', function () {
	// use a little delay when running on AppVeyor (because it's shit)
	var delay = process.env.AVA_APPVEYOR ? 100 : 0;

	globals.setTimeout(function () {
		process.exit(0); // eslint-disable-line xo/no-process-exit
	}, delay);
});

var tearingDown = false;
process.on('ava-teardown', function () {
	// ava-teardown can be sent more than once.
	if (tearingDown) {
		return;
	}
	tearingDown = true;

	var rejections = currentlyUnhandled();

	if (rejections.length === 0) {
		exit();
		return;
	}

	rejections = rejections.map(function (rejection) {
		return serializeError(rejection.reason);
	});

	send('unhandledRejections', {rejections: rejections});
	globals.setTimeout(exit, 100);
});

function exit() {
	// Include dependencies in the final teardown message. This ensures the full
	// set of dependencies is included no matter how the process exits, unless
	// it flat out crashes.
	send('teardown', {dependencies: dependencies});
}
