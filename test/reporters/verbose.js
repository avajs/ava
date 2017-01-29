'use strict';
var path = require('path');
var indentString = require('indent-string');
var flatten = require('arr-flatten');
var tempWrite = require('temp-write');
var figures = require('figures');
var chalk = require('chalk');
var sinon = require('sinon');
var test = require('tap').test;
var lolex = require('lolex');
var repeating = require('repeating');
var beautifyStack = require('../../lib/beautify-stack');
var colors = require('../../lib/colors');
var verboseReporter = require('../../lib/reporters/verbose');
var compareLineOutput = require('../helper/compare-line-output');
var formatAssertError = require('../../lib/format-assert-error');
var codeExcerpt = require('../../lib/code-excerpt');

chalk.enabled = true;

var stackLineRegex = /.+ \(.+:[0-9]+:[0-9]+\)/;

lolex.install(new Date(2014, 11, 19, 17, 19, 12, 200).getTime(), ['Date']);
var time = ' ' + chalk.grey.dim('[17:19:12]');

function createReporter(options) {
	var reporter = verboseReporter(options);
	return reporter;
}

function createRunStatus() {
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

	t.is(reporter.start(createRunStatus()), '');
	t.end();
});

test('passing test and duration less than threshold', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'passed',
		duration: 90
	}, createRunStatus());

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed';

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test and duration greater than threshold', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'passed',
		duration: 150
	}, createRunStatus());

	var expectedOutput = '  ' + chalk.green(figures.tick) + ' passed' + chalk.grey.dim(' (150ms)');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('don\'t display test title if there is only one anonymous test', function (t) {
	var reporter = createReporter();

	var output = reporter.test({
		title: '[anonymous]'
	}, createRunStatus());

	t.is(output, undefined);
	t.end();
});

test('known failure test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'known failure',
		failing: true
	}, createRunStatus());

	var expectedOutput = '  ' + chalk.red(figures.tick) + ' ' + chalk.red('known failure');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	}, createRunStatus());

	var expectedOutput = '  ' + chalk.red(figures.cross) + ' failed ' + chalk.red('assertion failed');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', function (t) {
	var reporter = createReporter();

	var actualOutput = reporter.test({
		title: 'skipped',
		skip: true
	}, createRunStatus());

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
	}, createRunStatus());

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
	}, createRunStatus()).split('\n');

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
	}, createRunStatus()).split('\n');

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
	}, createRunStatus()).split('\n');

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

	var output = reporter.unhandledError(err, createRunStatus()).split('\n');

	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.is(output[1], '  ' + chalk.red(JSON.stringify(err)));
	t.end();
});

test('results with passing tests', function (t) {
	var reporter = createReporter();
	var runStatus = createRunStatus();
	runStatus.passCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.knownFailureCount = 1;
	runStatus.knownFailures = [{
		title: 'known failure',
		failing: true
	}];

	var actualOutput = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 known failure'),
		'',
		'',
		'  ' + chalk.red('known failure'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', function (t) {
	var reporter = createReporter();
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.skipCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.todoCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.rejectionCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.rejectionCount = 1;

	var actualOutput = reporter.finish(runStatus);
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
	const err1Path = tempWrite.sync('a()');
	error1.source = {file: path.basename(err1Path), line: 1};
	error1.showOutput = true;
	error1.actual = JSON.stringify('abc');
	error1.actualType = 'string';
	error1.expected = JSON.stringify('abd');
	error1.expectedType = 'string';

	var error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b()');
	error2.source = {file: path.basename(err2Path), line: 1};
	error2.showOutput = true;
	error2.actual = JSON.stringify([1]);
	error2.actualType = 'array';
	error2.expected = JSON.stringify([2]);
	error2.expectedType = 'array';

	var reporter = createReporter({basePath: path.dirname(err1Path)});
	var runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}];

	var output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
		'  ' + chalk.grey(`${error1.source.file}:${error1.source.line}`),
		'',
		indentString(codeExcerpt(err1Path, error1.source.line), 2).split('\n'),
		'',
		indentString(formatAssertError(error1), 2).split('\n'),
		/error one message/,
		'',
		stackLineRegex,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(err2Path, error2.source.line), 2).split('\n'),
		'',
		indentString(formatAssertError(error2), 2).split('\n'),
		/error two message/,
		'',
		stackLineRegex
	]));
	t.end();
});

test('results with errors and disabled code excerpts', function (t) {
	var error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	error1.showOutput = true;
	error1.actual = JSON.stringify('abc');
	error1.actualType = 'string';
	error1.expected = JSON.stringify('abd');
	error1.expectedType = 'string';

	var error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b()');
	error2.source = {file: path.basename(err2Path), line: 1};
	error2.showOutput = true;
	error2.actual = JSON.stringify([1]);
	error2.actualType = 'array';
	error2.expected = JSON.stringify([2]);
	error2.expectedType = 'array';

	var reporter = createReporter({basePath: path.dirname(err2Path)});
	var runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}];

	var output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
		'',
		indentString(formatAssertError(error1), 2).split('\n'),
		/error one message/,
		'',
		stackLineRegex,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(err2Path, error2.source.line), 2).split('\n'),
		'',
		indentString(formatAssertError(error2), 2).split('\n'),
		/error two message/,
		'',
		stackLineRegex
	]));
	t.end();
});

test('results with errors and disabled assert output', function (t) {
	var error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	const err1Path = tempWrite.sync('a();');
	error1.source = {file: path.basename(err1Path), line: 1};
	error1.showOutput = false;
	error1.actual = JSON.stringify('abc');
	error1.actualType = 'string';
	error1.expected = JSON.stringify('abd');
	error1.expectedType = 'string';

	var error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b();');
	error2.source = {file: path.basename(err2Path), line: 1};
	error2.showOutput = true;
	error2.actual = JSON.stringify([1]);
	error2.actualType = 'array';
	error2.expected = JSON.stringify([2]);
	error2.expectedType = 'array';

	var reporter = createReporter({basePath: path.dirname(err1Path)});
	var runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}];

	var output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
		'  ' + chalk.grey(`${error1.source.file}:${error1.source.line}`),
		'',
		indentString(codeExcerpt(err1Path, error1.source.line), 2).split('\n'),
		'',
		/error one message/,
		'',
		stackLineRegex,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(err2Path, error2.source.line), 2).split('\n'),
		'',
		indentString(formatAssertError(error2), 2).split('\n'),
		/error two message/,
		'',
		stackLineRegex
	]));
	t.end();
});

test('results when fail-fast is enabled', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.remainingCount = 1;
	runStatus.failCount = 1;
	runStatus.failFastEnabled = true;
	runStatus.tests = [{
		title: 'failed test'
	}];

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.red('1 test failed') + time,
		'',
		'',
		'  ' + colors.information('`--fail-fast` is on. Any number of tests may have been skipped'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results without fail-fast if no failing tests', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.remainingCount = 1;
	runStatus.failCount = 0;
	runStatus.passCount = 1;
	runStatus.failFastEnabled = true;

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results without fail-fast if no skipped tests', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.remainingCount = 0;
	runStatus.failCount = 1;
	runStatus.failFastEnabled = true;
	runStatus.tests = [{
		title: 'failed test'
	}];

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.red('1 test failed') + time,
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results with 1 previous failure', function (t) {
	var reporter = createReporter();

	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.previousFailCount = 1;

	var output = reporter.finish(runStatus);
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

	var runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.previousFailCount = 2;

	var output = reporter.finish(runStatus);
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

	const prevColumns = process.stdout.columns;
	process.stdout.columns = 80;
	var output = reporter.section();
	process.stdout.columns = prevColumns;

	t.is(output, chalk.gray.dim(repeating('\u2500', 80)));
	t.end();
});

test('write calls console.error', function (t) {
	var stub = sinon.stub(console, 'error');
	var reporter = verboseReporter();
	reporter.write('result');
	t.true(stub.called);
	console.error.restore();
	t.end();
});

test('reporter.stdout and reporter.stderr both use process.stderr.write', function (t) {
	var reporter = verboseReporter();
	var stub = sinon.stub(process.stderr, 'write');
	reporter.stdout('result');
	reporter.stderr('result');
	t.is(stub.callCount, 2);
	process.stderr.write.restore();
	t.end();
});

test('results when hasExclusive is enabled, but there are no known remaining tests', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.passCount = 1;

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results when hasExclusive is enabled, but there is one remaining tests', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.testCount = 2;
	runStatus.passCount = 1;
	runStatus.failCount = 0;
	runStatus.remainingCount = 1;

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'',
		'',
		'  ' + colors.information('The .only() modifier is used in some tests. 1 test was not run'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results when hasExclusive is enabled, but there are multiple remaining tests', function (t) {
	var reporter = verboseReporter();
	var runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.testCount = 3;
	runStatus.passCount = 1;
	runStatus.failCount = 0;
	runStatus.remainingCount = 2;

	var output = reporter.finish(runStatus);
	var expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'',
		'',
		'  ' + colors.information('The .only() modifier is used in some tests. 2 tests were not run'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}
