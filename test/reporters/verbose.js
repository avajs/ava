'use strict';
var figures = require('figures');
var chalk = require('chalk');
var test = require('tap').test;
var beautifyStack = require('../../lib/beautify-stack');
var verboseReporter = require('../../lib/reporters/verbose');

chalk.enabled = true;

function createReporter() {
	var reporter = verboseReporter();
	return reporter;
}

function createTestData() {
	return {
		fileCount: 1,
		testCount: 1
	};
}

test('beautify stack - removes uninteresting lines', function (t) {
	try {
		fooFunc();
	} catch (err) {
		var stack = beautifyStack(err.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		t.match(err.stack, /Module._compile/);
		t.notMatch(stack, /Module\._compile/);
		t.end();
	}
});

test('start', function (t) {
	var reporter = createReporter();

	t.is(reporter.start(createTestData()), '');
	t.end();
});

test('passing test and duration less than threshold', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'passed',
		duration: 90
	}, createTestData());

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed';

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test and duration greater than threshold', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'passed',
		duration: 150
	}, createTestData());

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed' + chalk.grey.dim(' (150ms)');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('don\'t display test title if there is only one anonymous test', function (t) {
	var reporter = createReporter();

	var output = reporter.test({
		title: '[anonymous]'
	}, createTestData());

	t.is(output, undefined);
	t.end();
});

test('failing test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	}, createTestData());

	var expectedOutput = '  ' + chalk.red(figures.cross) + ' failed ' + chalk.red('assertion failed');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'skipped',
		skip: true
	}, createTestData());

	var expectedOutput = '  ' + chalk.yellow('- skipped');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('todo test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'todo',
		skip: true,
		todo: true
	}, createTestData());

	var expectedOutput = '  ' + chalk.blue('- todo');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('uncaught exception', function (t) {
	var reporter = createReporter();

	var error = new Error('Unexpected token');

	var output = reporter.unhandledError({
		type: 'exception',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, createTestData()).split('\n');

	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('ava error', function (t) {
	var reporter = createReporter();

	var output = reporter.unhandledError({
		type: 'exception',
		file: 'test.js',
		name: 'AvaError',
		message: 'A futuristic test runner'
	}, createTestData()).split('\n');

	t.is(output[0], chalk.red('  ' + figures.cross + ' A futuristic test runner'));
	t.end();
});

test('unhandled rejection', function (t) {
	var reporter = createReporter();

	var error = new Error('Unexpected token');

	var output = reporter.unhandledError({
		type: 'rejection',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, createTestData()).split('\n');

	t.is(output[0], chalk.red('Unhandled Rejection: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('unhandled error without stack', function (t) {
	var reporter = createReporter();

	var err = {
		type: 'exception',
		file: 'test.js',
		message: 'test'
	};

	var output = reporter.unhandledError(err, createTestData()).split('\n');

	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.is(output[1], '  ' + chalk.red(JSON.stringify(err)));
	t.end();
});

test('results with passing tests', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;
	testData.skipCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		'  ' + chalk.yellow('1 test skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;
	testData.todoCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		'  ' + chalk.blue('1 test todo'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and rejections', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;
	testData.rejectionCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		'  ' + chalk.red('1 unhandled rejection'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and exceptions', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;
	testData.exceptionCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		'  ' + chalk.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests, rejections and exceptions', function (t) {
	var reporter = createReporter();
	var testData = createTestData();
	testData.passCount = 1;
	testData.exceptionCount = 1;
	testData.rejectionCount = 1;

	var actualOutput = reporter.finish(testData);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed'),
		'  ' + chalk.red('1 unhandled rejection'),
		'  ' + chalk.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with errors', function (t) {
	var error = new Error('error message');
	error.stack = beautifyStack(error.stack);

	var reporter = createReporter();
	var testData = createTestData();
	testData.failCount = 1;
	testData.tests = [{
		title: 'fail',
		error: error
	}];

	var output = reporter.finish(testData).split('\n');

	t.is(output[1], '  ' + chalk.red('1 test failed'));
	t.is(output[3], '  ' + chalk.red('1. fail'));
	t.match(output[4], /Error: error message/);
	t.match(output[5], /test\/reporters\/verbose\.js/);
	t.end();
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}
