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
