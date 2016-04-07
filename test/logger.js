'use strict';
var test = require('tap').test;
var Logger = require('../lib/logger');
var tap = require('../lib/reporters/tap');

test('must be called with new', function (t) {
	t.throws(function () {
		var logger = Logger;
		logger();
	}, {message: 'Class constructor Logger cannot be invoked without \'new\''});
	t.end();
});

test('only call start if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.start = undefined;
	logger.start();
	t.end();
});

test('only write if start is supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.start = undefined;
	logger.write = t.fail;
	logger.start();
	t.end();
});

test('only call reset if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.reset = undefined;
	logger.reset();
	t.end();
});

test('only write if reset is supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.reset = undefined;
	logger.write = t.fail;
	logger.reset();
	t.end();
});

test('only call clear if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.clear = undefined;
	logger.clear();
	t.end();
});

test('only write if clear is supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.clear = undefined;
	logger.write = t.fail;
	logger.clear();
	t.end();
});

test('writes the reporter reset result', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.reset = function () {
		return 'test reset';
	};
	logger.write = function (str) {
		t.equal(str, 'test reset');
		t.end();
	};
	logger.reset();
});

test('only call unhandledError if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.unhandledError = undefined;
	logger.unhandledError();
	t.end();
});

test('only write if unhandledError is supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.unhandledError = undefined;
	logger.write = t.fail;
	logger.unhandledError();
	t.end();
});

test('only call finish if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.finish = undefined;
	logger.finish();
	t.end();
});

test('only write if finish is supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.finish = undefined;
	logger.write = t.fail;
	logger.finish();
	t.end();
});

test('only call write if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.write = undefined;
	logger.write();
	t.end();
});

test('only call stdout if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.stdout = undefined;
	logger.stdout();
	t.end();
});

test('don\'t alter data when calling stdout', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.stdout = function (data) {
		t.equal(data, 'test data');
		t.end();
	};
	logger.stdout('test data');
});

test('only call stderr if supported by reporter', function (t) {
	var tapReporter = tap();
	var logger = new Logger(tapReporter);
	tapReporter.stderr = undefined;
	logger.stderr();
	t.end();
});
