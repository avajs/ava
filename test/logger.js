'use strict';
var test = require('tap').test;
var Logger = require('../lib/logger');
var Tap = require('../lib/reporters/tap');

test('must be called with new', function (t) {
	t.throws(function () {
		var logger = Logger;
		logger();
	}, {message: 'Class constructor Logger cannot be invoked without \'new\''});
	t.end();
});

test('only call start if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.start = undefined;
	logger.use(tapReporter);
	logger.start();
	t.end();
});

test('only write if start is supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.start = undefined;
	logger.use(tapReporter);
	logger.write = t.fail;
	logger.start();
	t.end();
});

test('only call reset if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.reset = undefined;
	logger.use(tapReporter);
	logger.reset();
	t.end();
});

test('only write if reset is supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.reset = undefined;
	logger.use(tapReporter);
	logger.write = t.fail;
	logger.reset();
	t.end();
});

test('only call unhandledError if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.unhandledError = undefined;
	logger.use(tapReporter);
	logger.unhandledError();
	t.end();
});

test('only write if unhandledError is supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.unhandledError = undefined;
	logger.use(tapReporter);
	logger.write = t.fail;
	logger.unhandledError();
	t.end();
});

test('only call finish if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.finish = undefined;
	logger.use(tapReporter);
	logger.finish();
	t.end();
});

test('only write if finish is supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.finish = undefined;
	logger.use(tapReporter);
	logger.write = t.fail;
	logger.finish();
	t.end();
});

test('only call write if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.write = undefined;
	logger.use(tapReporter);
	logger.write();
	t.end();
});

test('only call stdout if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.stdout = undefined;
	logger.use(tapReporter);
	logger.stdout();
	t.end();
});

test('only call stderr if supported by reporter', function (t) {
	var logger = new Logger();
	var tapReporter = Tap();
	tapReporter.stderr = undefined;
	logger.use(tapReporter);
	logger.stderr();
	t.end();
});
