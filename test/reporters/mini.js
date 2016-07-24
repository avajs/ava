'use strict';
var EventEmitter = require('events');
var chalk = require('chalk');
var test = require('tap').test;
var cross = require('figures').cross;
var lolex = require('lolex');
var assign = require('object-assign');
var repeating = require('repeating');
var AvaError = require('../../lib/ava-error');
var RunStatus = require('../../lib/run-status');
var miniReporter = require('../../lib/reporters/mini');
var beautifyStack = require('../../lib/beautify-stack');
var colors = require('../../lib/colors');
var compareLineOutput = require('../helper/compare-line-output');

chalk.enabled = true;

var graySpinner = chalk.gray.dim(process.platform === 'win32' ? '-' : '⠋');

// Needed because tap doesn't emulate a tty environment and thus this is
// undefined, making `cli-truncate` append '...' to test titles
process.stdout.columns = 5000;
var fullWidthLine = chalk.gray.dim(repeating('\u2500', 5000));

process.stderr.setMaxListeners(50);

function createReporter(options) {
	var reporter = miniReporter(options);
	reporter.output = null;

	reporter.write = function (str) {
		reporter.output = str;
	};

	return reporter;
}

function createRunStatus(options) {
	var status = new RunStatus({prefixTitles: false});
	assign(status, options);

	var fork = new EventEmitter();
	status.fork = fork;

	status.observeFork(fork);

	return status;
}

test('start', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	t.is(reporter.output, ' \n ' + graySpinner + ' ');
	t.end();
});

test('passing test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'passed'
	});

	var actualOutput = reporter.output;
	var expectedOutput = [
		' ',
		' ' + graySpinner + ' passed',
		'',
		'   ' + chalk.green('1 passed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('known failure test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'known failure',
		failing: true
	});

	var actualOutput = reporter.output;
	var expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + chalk.red('known failure'),
		'',
		'   ' + chalk.red('1 known failure')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	var actualOutput = reporter.output;
	var expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + chalk.red('failed'),
		'',
		'   ' + chalk.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failed known failure test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'known failure',
		failing: true,
		error: {
			message: 'Test was expected to fail, but succeeded, you should stop marking the test as failing'
		}
	});

	var actualOutput = reporter.output;
	var expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + chalk.red('known failure'),
		'',
		'   ' + chalk.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test after failing', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	status.fork.emit('test', {
		title: 'passed'
	});

	var actualOutput = reporter.output;

	var expectedOutput = [
		' ',
		' ' + graySpinner + ' passed',
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test after passing', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.fork.emit('test', {
		title: 'passed'
	});

	status.fork.emit('test', {
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	var actualOutput = reporter.output;
	var expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + chalk.red('failed'),
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	var previousOutput = reporter.output;

	status.fork.emit('test', {
		title: 'skipped',
		skip: true
	});

	var currentOutput = reporter.output;

	t.is(currentOutput, previousOutput);
	t.end();
});

test('todo test', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	var previousOutput = reporter.output;

	status.fork.emit('test', {
		title: 'todo',
		skip: true,
		todo: true
	});

	var currentOutput = reporter.output;

	t.is(currentOutput, previousOutput);
	t.end();
});

test('results with passing tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		failCount: 0
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'\n   ' + chalk.green('1 passed'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing known failure tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		failCount: 0,
		knownFailureCount: 1,
		knownFailures: [{
			title: 'known failure',
			failing: true
		}]
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'\n   ' + chalk.green('1 passed'),
		'   ' + chalk.red('1 known failure'),
		'',
		'',
		'   ' + chalk.red('1. known failure'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		skipCount: 1,
		failCount: 0
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.yellow('1 skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 0,
		todoCount: 1,
		failCount: 0
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'\n   ' + chalk.blue('1 todo'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing skipped tests', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		passCount: 1,
		skipCount: 1
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.yellow('1 skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and rejections', function (t) {
	var reporter = createReporter();

	var err1 = new Error('failure one');
	err1.type = 'rejection';
	err1.stack = beautifyStack(err1.stack);
	var err2 = new Error('failure two');
	err2.type = 'rejection';
	err2.stack = 'stack line with trailing whitespace\t\n';

	var status = createRunStatus({
		passCount: 1,
		rejectionCount: 1,
		errors: [err1, err2]
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.red('1 rejection'),
		'',
		'',
		'   ' + chalk.red('1. Unhandled Rejection'),
		/Error: failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'   ' + chalk.red('2. Unhandled Rejection'),
		'   ' + colors.stack('stack line with trailing whitespace')
	]);
	t.end();
});

test('results with passing tests and exceptions', function (t) {
	var reporter = createReporter();

	var err = new Error('failure');
	err.type = 'exception';
	err.stack = beautifyStack(err.stack);

	var avaErr = new AvaError('A futuristic test runner');
	avaErr.type = 'exception';

	var status = createRunStatus({
		passCount: 1,
		exceptionCount: 2,
		errors: [err, avaErr]
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'   ' + chalk.green('1 passed'),
		'   ' + chalk.red('2 exceptions'),
		'',
		'',
		'   ' + chalk.red('1. Uncaught Exception'),
		/Error: failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'   ' + chalk.red(cross + ' A futuristic test runner')
	]);
	t.end();
});

test('results with errors', function (t) {
	var reporter = createReporter();

	var err1 = new Error('failure one');
	err1.stack = beautifyStack(err1.stack);
	var err2 = new Error('failure two');
	err2.stack = 'first line is stripped\nstack line with trailing whitespace\t\n';

	var status = createRunStatus({
		failCount: 1,
		errors: [{
			title: 'failed one',
			error: err1
		}, {
			title: 'failed two',
			error: err2
		}]
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'   ' + chalk.red('1 failed'),
		'',
		'',
		'   ' + chalk.red('1. failed one'),
		/failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'   ' + chalk.red('2. failed two')
	].concat(
		colors.stack('   failure two\n  stack line with trailing whitespace').split('\n')
	));
	t.end();
});

test('results with 1 previous failure', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		todoCount: 1,
		previousFailCount: 1
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'   ' + colors.todo('1 todo'),
		'   ' + colors.error('1 previous failure in test files that were not rerun')
	]);
	t.end();
});

test('results with 2 previous failures', function (t) {
	var reporter = createReporter();
	var status = createRunStatus({
		todoCount: 1,
		previousFailCount: 2
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	compareLineOutput(t, output, [
		'',
		'   ' + colors.todo('1 todo'),
		'   ' + colors.error('2 previous failures in test files that were not rerun')
	]);
	t.end();
});

test('empty results after reset', function (t) {
	var reporter = createReporter();
	var oldStatus = createRunStatus({
		failCount: 1
	});

	var status = createRunStatus();

	reporter.init(oldStatus);
	reporter.clearInterval();
	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var output = reporter.output;
	t.is(output, '\n');
	t.end();
});

test('full-width line when sectioning', function (t) {
	var reporter = createReporter();
	var status = createRunStatus();

	reporter.init(status);
	reporter.clearInterval();

	status.emit('section');

	var output = reporter.output;
	t.is(output, '\n' + fullWidthLine);
	t.end();
});

test('results with watching enabled', function (t) {
	lolex.install(new Date(2014, 11, 19, 17, 19, 12, 200).getTime(), ['Date']);
	var time = ' ' + chalk.grey.dim('[17:19:12]');

	var reporter = createReporter({watching: true});
	var status = createRunStatus({
		passCount: 1,
		failCount: 0
	});

	reporter.init(status);
	reporter.clearInterval();

	status.emit('finish');

	var actualOutput = reporter.output;
	var expectedOutput = [
		'\n   ' + chalk.green('1 passed') + time,
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});
