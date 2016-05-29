'use strict';

var EventEmitter = require('events').EventEmitter;
var path = require('path');
var Promise = require('bluebird'); // eslint-disable-line
var debug = require('debug')('ava');
var send = require('./send');

// bind globals first before anything has a chance to interfere
var globals = require('./globals');

var events = globals.events = new EventEmitter();

// Bluebird specific
Promise.longStackTraces();

// var loudRejection = require('loud-rejection/api')(process); // eslint-disable-line
var serializeError = require('./serialize-error');
// var throwsHelper = require('./throws-helper');

// check if test files required ava and show error, when they didn't
exports.avaRequired = false;

events.on('ava-init', function (options) {
	globals.options = options;

	var testPath = options.file;
	require(testPath);

	// if ava was not required, show an error
	if (!exports.avaRequired) {
		send('no-tests', {avaRequired: false});
	}
});

// process.on('unhandledRejection', throwsHelper);

// process.on('uncaughtException', function (exception) {
// 	throwsHelper(exception);
// 	send('uncaughtException', {exception: serializeError(exception)});
// });

// parse and re-emit ava messages
self.addEventListener('message', function (e) {
	var event = e.data;

	if (!event || !event.ava) {
		return;
	}

	events.emit(event.name, event.data);
}, false);

events.on('ava-exit', function () {
	exit();
});

var tearingDown = false;
events.on('ava-teardown', function () {
	// ava-teardown can be sent more than once.
	if (tearingDown) {
		return;
	}
	tearingDown = true;

	// var rejections = loudRejection.currentlyUnhandled();

	// if (rejections.length === 0) {
	// 	exit();
	// 	return;
	// }

	// rejections = rejections.map(function (rejection) {
	// 	return serializeError(rejection.reason);
	// });

	// send('unhandledRejections', {rejections: rejections});
	// globals.setTimeout(exit, 100);

	exit();
});

function exit() {
	send('exit');

	globals.setTimeout(close, 100);
}
