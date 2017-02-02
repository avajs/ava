'use strict';
const test = require('tap').test;
const Logger = require('../lib/logger');
const TapReporter = require('../lib/reporters/tap');

test('only call start if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.start = undefined;
	logger.start();
	t.end();
});

test('only write if start is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.start = undefined;
	logger.write = t.fail;
	logger.start();
	t.end();
});

test('only call reset if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.reset = undefined;
	logger.reset();
	t.end();
});

test('only write if reset is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.reset = undefined;
	logger.write = t.fail;
	logger.reset();
	t.end();
});

test('only call section if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.section = undefined;
	logger.section();
	t.end();
});

test('only write if section is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.section = undefined;
	logger.write = t.fail;
	logger.section();
	t.end();
});

test('only call clear if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.clear = undefined;
	logger.clear();
	t.end();
});

test('only write if clear is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.clear = undefined;
	logger.write = t.fail;
	logger.clear();
	t.end();
});

test('return false if clear is not supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.clear = undefined;
	t.false(logger.clear());
	t.end();
});

test('return true if clear is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.clear = () => {};
	t.true(logger.clear());
	t.end();
});

test('writes the reporter reset result', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.reset = () => 'test reset';
	logger.write = str => {
		t.equal(str, 'test reset');
		t.end();
	};
	logger.reset();
});

test('only call unhandledError if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.unhandledError = undefined;
	logger.unhandledError();
	t.end();
});

test('only write if unhandledError is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.unhandledError = undefined;
	logger.write = t.fail;
	logger.unhandledError();
	t.end();
});

test('only call finish if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.finish = undefined;
	logger.finish();
	t.end();
});

test('only write if finish is supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.finish = undefined;
	logger.write = t.fail;
	logger.finish();
	t.end();
});

test('only call write if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.write = undefined;
	logger.write();
	t.end();
});

test('only call stdout if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.stdout = undefined;
	logger.stdout();
	t.end();
});

test('don\'t alter data when calling stdout', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.stdout = function (data) {
		t.equal(data, 'test data');
		t.end();
	};
	logger.stdout('test data');
});

test('only call stderr if supported by reporter', t => {
	const tapReporter = new TapReporter();
	const logger = new Logger(tapReporter);
	tapReporter.stderr = undefined;
	logger.stderr();
	t.end();
});
