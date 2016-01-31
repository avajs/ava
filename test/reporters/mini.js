'use strict';
var chalk = require('chalk');
var test = require('tap').test;
var miniReporter = require('../../lib/reporters/mini');
var beautifyStack = require('../../lib/beautify-stack');

process.stderr.setMaxListeners(50);

test('start', function (t) {
	var reporter = miniReporter();

	t.is(reporter.start(), '');
	t.end();
});

test('passing test', function (t) {
	var reporter = miniReporter();

	var actualOutput = reporter.test({
		title: 'passed'
	});

	var expectedOutput = [
		'  ' + chalk.green('passed'),
		'',
		'  ' + chalk.green('1 passed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = miniReporter();

	var actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	var expectedOutput = [
		'  ' + chalk.red('failed'),
		'',
		'  ' + chalk.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', function (t) {
	var reporter = miniReporter();

	var actualOutput = reporter.test({
		title: 'skipped',
		skip: true
	});

	var expectedOutput = [
		'  ' + chalk.yellow('- skipped'),
		'',
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 1;
	reporter.failCount = 0;

	var actualOutput = reporter.finish();
	var expectedOutput = [
		'  ' + chalk.green('1 passed'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 0;
	reporter.skipCount = 1;
	reporter.failCount = 0;

	var actualOutput = reporter.finish();
	var expectedOutput = [
		'  ' + chalk.yellow('1 skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing skipped tests', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 1;
	reporter.skipCount = 1;

	var output = reporter.finish().split('\n');

	t.is(output[0], '  ' + chalk.green('1 passed') + '  ' + chalk.yellow('1 skipped'));
	t.is(output[1], '');
	t.end();
});

test('results with passing tests and rejections', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 1;
	reporter.rejectionCount = 1;

	var err = new Error('failure');
	err.type = 'rejection';
	err.stack = beautifyStack(err.stack);

	reporter.api = {
		errors: [err]
	};

	var output = reporter.finish().split('\n');

	t.is(output[0], '  ' + chalk.green('1 passed'));
	t.is(output[1], '  ' + chalk.red('1 rejection'));
	t.is(output[2], '');
	t.is(output[3], '  ' + chalk.red('1. Unhandled Rejection'));
	t.match(output[4], /Error: failure/);
	t.match(output[5], /test\/reporters\/mini\.js/);
	t.end();
});

test('results with passing tests and exceptions', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 1;
	reporter.exceptionCount = 1;

	var err = new Error('failure');
	err.type = 'exception';
	err.stack = beautifyStack(err.stack);

	reporter.api = {
		errors: [err]
	};

	var output = reporter.finish().split('\n');

	t.is(output[0], '  ' + chalk.green('1 passed'));
	t.is(output[1], '  ' + chalk.red('1 exception'));
	t.is(output[2], '');
	t.is(output[3], '  ' + chalk.red('1. Uncaught Exception'));
	t.match(output[4], /Error: failure/);
	t.match(output[5], /test\/reporters\/mini\.js/);
	t.end();
});

test('results with errors', function (t) {
	var reporter = miniReporter();
	reporter.failCount = 1;

	var err = new Error('failure');
	err.stack = beautifyStack(err.stack);

	reporter.api = {
		errors: [{
			title: 'failed',
			error: err
		}]
	};

	var output = reporter.finish().split('\n');

	t.is(output[0], '  ' + chalk.red('1 failed'));
	t.is(output[1], '');
	t.is(output[2], '  ' + chalk.red('1. failed'));
	t.match(output[3], /failure/);
	t.match(output[4], /Error: failure/);
	t.match(output[5], /test\/reporters\/mini\.js/);
	t.end();
});
