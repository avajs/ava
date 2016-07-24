'use strict';
var EventEmitter = require('events').EventEmitter;
var figures = require('figures');
var assign = require('object-assign');
var chalk = require('chalk');
var test = require('tap').test;
var lolex = require('lolex');
var repeating = require('repeating');
var beautifyStack = require('../../lib/beautify-stack');
var colors = require('../../lib/colors');
var verboseReporter = require('../../lib/reporters/verbose');
var compareLineOutput = require('../helper/compare-line-output');

chalk.enabled = true;

// tap doesn't emulate a tty environment and thus process.stdout.columns is
// undefined. Expect an 80 character wide line to be rendered.
var fullWidthLine = chalk.gray.dim(repeating('\u2500', 80));

lolex.install(new Date(2014, 11, 19, 17, 19, 12, 200).getTime(), ['Date']);
var time = ' ' + chalk.grey.dim('[17:19:12]');

function createReporter() {
	var reporter = verboseReporter();
	reporter.output = null;

	reporter.write = function (str) {
		this.output = str;
	};

	return reporter;
}

function createRunStatus(options) {
	var status = new EventEmitter();
	assign(status, options);

	return status;
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
	var status = createRunStatus();

	reporter.init(status);

	t.is(reporter.output, '');
	t.end();
});

test('passing test and duration less than threshold', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'passed',
		duration: 90
	}, status);

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed';
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test and duration greater than threshold', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'passed',
		duration: 150
	}, status);

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed' + chalk.grey.dim(' (150ms)');
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('don\'t display test title if there is only one anonymous test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		fileCount: 1,
		testCount: 1
	});

	reporter.init(status);

	status.emit('test', {
		title: '[anonymous]'
	}, status);

	t.is(reporter.output, '');
	t.end();
});

test('known failure test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'known failure',
		failing: true
	}, status);

	var expectedOutput = '  ' + chalk.red(figures.tick) + ' ' + chalk.red('known failure');
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	}, status);

	var expectedOutput = '  ' + chalk.red(figures.cross) + ' failed ' + chalk.red('assertion failed');
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'skipped',
		skip: true
	}, status);

	var expectedOutput = '  ' + chalk.yellow('- skipped');
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('todo test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('test', {
		title: 'todo',
		skip: true,
		todo: true
	}, status);

	var expectedOutput = '  ' + chalk.blue('- todo');
	var actualOutput = reporter.output;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('uncaught exception', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	var error = new Error('Unexpected token');

	status.emit('error', {
		type: 'exception',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, status);

	var output = reporter.output.split('\n');
	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('ava error', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('error', {
		type: 'exception',
		file: 'test.js',
		name: 'AvaError',
		message: 'A futuristic test runner'
	}, status);

	var output = reporter.output.split('\n');
	t.is(output[0], chalk.red('  ' + figures.cross + ' A futuristic test runner'));
	t.end();
});

test('unhandled rejection', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	var error = new Error('Unexpected token');

	status.emit('error', {
		type: 'rejection',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, status);

	var output = reporter.output.split('\n');
	t.is(output[0], chalk.red('Unhandled Rejection: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('unhandled error without stack', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	var err = {
		type: 'exception',
		file: 'test.js',
		message: 'test'
	};

	status.emit('error', err, status);

	var output = reporter.output.split('\n');
	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.is(output[1], '  ' + chalk.red(JSON.stringify(err)));
	t.end();
});

test('results with passing tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing known failure tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		knownFailureCount: 1,
		knownFailures: [{
			title: 'known failure',
			failing: true
		}]
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 known failure'),
		'',
		'',
		'  ' + chalk.red('1. known failure'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		skipCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.yellow('1 test skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		todoCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.blue('1 test todo'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and rejections', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		rejectionCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 unhandled rejection'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and exceptions', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		exceptionCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests, rejections and exceptions', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		exceptionCount: 1,
		rejectionCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 unhandled rejection'),
		'  ' + chalk.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with errors', function (t) {
	var error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	var error2 = new Error('error two message');
	error2.stack = 'stack line with trailing whitespace\t\n';

	var reporter = createReporter();
	var status = createRunStatus({
		failCount: 1,
		tests: [{
			title: 'fail one',
			error: error1
		}, {
			title: 'fail two',
			error: error2
		}]
	});

	reporter.init(status);

	status.emit('finish', status);

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'  ' + chalk.red('1 test failed') + time,
		'',
		'',
		'  ' + chalk.red('1. fail one'),
		/Error: error one message/,
		/test\/reporters\/verbose\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'  ' + chalk.red('2. fail two'),
		'  ' + colors.stack('stack line with trailing whitespace')
	]);
	t.end();
});

test('results with 1 previous failure', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		exceptionCount: 1,
		previousFailCount: 1
	});

	reporter.init(status);

	status.emit('finish', status);

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'  ' + colors.pass('1 test passed') + time,
		'  ' + colors.error('1 uncaught exception'),
		'  ' + colors.error('1 previous failure in test files that were not rerun')
	]);
	t.end();
});

test('results with 2 previous failures', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		exceptionCount: 1,
		previousFailCount: 2
	});

	reporter.init(status);

	status.emit('finish', status);

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'  ' + colors.pass('1 test passed') + time,
		'  ' + colors.error('1 uncaught exception'),
		'  ' + colors.error('2 previous failures in test files that were not rerun')
	]);
	t.end();
});

test('full-width line when sectioning', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);

	status.emit('section');

	t.is(reporter.output, fullWidthLine);
	t.end();
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}
