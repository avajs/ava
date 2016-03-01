'use strict';
var chalk = require('chalk');
var test = require('tap').test;
var AvaError = require('../../lib/ava-error');
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
		'\n  ' + chalk.green('1 passed'),
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
		'\n  ' + chalk.yellow('1 skipped'),
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

	t.is(output[0], '');
	t.is(output[1], '  ' + chalk.green('1 passed') + '  ' + chalk.yellow('1 skipped'));
	t.is(output[2], '');
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

	t.is(output[0], '');
	t.is(output[1], '  ' + chalk.green('1 passed'));
	t.is(output[2], '  ' + chalk.red('1 rejection'));
	t.is(output[3], '');
	t.is(output[4], '  ' + chalk.red('1. Unhandled Rejection'));
	t.match(output[5], /Error: failure/);
	t.match(output[6], /test\/reporters\/mini\.js/);
	t.end();
});

test('results with passing tests and exceptions', function (t) {
	var reporter = miniReporter();
	reporter.passCount = 1;
	reporter.exceptionCount = 2;

	var err = new Error('failure');
	err.type = 'exception';
	err.stack = beautifyStack(err.stack);

	var avaErr = new AvaError('A futuristic test runner');
	avaErr.type = 'exception';

	reporter.api = {
		errors: [err, avaErr]
	};

	var output = reporter.finish().split('\n');

	t.is(output[0], '');
	t.is(output[1], '  ' + chalk.green('1 passed'));
	t.is(output[2], '  ' + chalk.red('2 exceptions'));
	t.is(output[3], '');
	t.is(output[4], '  ' + chalk.red('1. Uncaught Exception'));
	t.match(output[5], /Error: failure/);
	t.match(output[6], /test\/reporters\/mini\.js/);
	var next = 6 + output.slice(6).indexOf('') + 1;
	t.is(output[next], '  ' + chalk.red('2. A futuristic test runner'));
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

	t.is(output[0], '');
	t.is(output[1], '  ' + chalk.red('1 failed'));
	t.is(output[2], '');
	t.is(output[3], '  ' + chalk.red('1. failed'));
	t.match(output[4], /failure/);
	t.match(output[5], /test\/reporters\/mini\.js/);
	t.end();
});

test('empty results after reset', function (t) {
	var reporter = miniReporter();

	reporter.failCount = 1;
	reporter.reset();

	var output = reporter.finish();
	t.is(output, '\n\n');
	t.end();
});
