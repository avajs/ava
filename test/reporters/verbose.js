'use strict';
require('../../lib/worker-options').set({});

// These tests are run as a sub-process of the `tap` module, so the standard
// output stream will not be recognized as a text terminal. AVA internals are
// sensitive to this detail and respond by automatically disable output
// coloring. Because the tests are written verify AVA's behavior in text
// terminals, that environment should be simulated prior to loading any
// modules.
process.stdout.isTTY = true;

const indentString = require('indent-string');
const flatten = require('arr-flatten');
const tempWrite = require('temp-write');
const figures = require('figures');
const sinon = require('sinon');
const test = require('tap').test;
const lolex = require('lolex');
const AssertionError = require('../../lib/assert').AssertionError;
const colors = require('../helper/colors');
const VerboseReporter = require('../../lib/reporters/verbose');
const compareLineOutput = require('../helper/compare-line-output');
const errorFromWorker = require('../helper/error-from-worker');
const codeExcerpt = require('../../lib/code-excerpt');

const stackLineRegex = /.+ \(.+:\d+:\d+\)/;

lolex.install({
	now: new Date(2014, 11, 19, 17, 19, 12, 200).getTime(),
	toFake: [
		'Date'
	]
});
const time = ' ' + colors.dimGray('[17:19:12]');

function createReporter(options) {
	if (options === undefined) {
		options = {color: true};
	}
	const reporter = new VerboseReporter(options);
	return reporter;
}

function createRunStatus() {
	return {
		fileCount: 1,
		testCount: 1
	};
}

function source(file, line) {
	return {
		file,
		line: line || 1,
		isWithinProject: true,
		isDependency: false
	};
}

test('start', t => {
	const reporter = createReporter();

	t.is(reporter.start(createRunStatus()), '');
	t.end();
});

test('passing test and duration less than threshold', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'passed',
		duration: 90
	}, createRunStatus());

	const expectedOutput = '  ' + colors.green(figures.tick) + ' passed';

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test and duration greater than threshold', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'passed',
		duration: 150
	}, createRunStatus());

	const expectedOutput = '  ' + colors.green(figures.tick) + ' passed' + colors.dimGray(' (150ms)');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('don\'t display test title if there is only one anonymous test', t => {
	const reporter = createReporter();

	const output = reporter.test({
		title: '[anonymous]'
	}, createRunStatus());

	t.is(output, undefined);
	t.end();
});

test('known failure test', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'known failure',
		failing: true
	}, createRunStatus());

	const expectedOutput = '  ' + colors.red(figures.tick) + ' ' + colors.red('known failure');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	}, createRunStatus());

	const expectedOutput = '  ' + colors.red(figures.cross) + ' failed ' + colors.red('assertion failed');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'skipped',
		skip: true
	}, createRunStatus());

	const expectedOutput = '  ' + colors.yellow('- skipped');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('todo test', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'todo',
		skip: true,
		todo: true
	}, createRunStatus());

	const expectedOutput = '  ' + colors.blue('- todo');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('uncaught exception', t => {
	const reporter = createReporter();

	const error = errorFromWorker(new Error('Unexpected token'), {
		type: 'exception',
		file: 'test.js'
	});

	const output = reporter.unhandledError(error, createRunStatus()).split('\n');

	t.is(output[0], colors.red('Uncaught Exception: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('ava error', t => {
	const reporter = createReporter();

	const output = reporter.unhandledError({
		type: 'exception',
		file: 'test.js',
		name: 'AvaError',
		message: 'A futuristic test runner'
	}, createRunStatus()).split('\n');

	t.is(output[0], colors.red('  ' + figures.cross + ' A futuristic test runner'));
	t.end();
});

test('unhandled rejection', t => {
	const reporter = createReporter();

	const error = errorFromWorker(new Error('Unexpected token'), {
		file: 'test.js',
		type: 'rejection'
	});

	const output = reporter.unhandledError(error, createRunStatus()).split('\n');

	t.is(output[0], colors.red('Unhandled Rejection: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('unhandled error without stack', t => {
	const reporter = createReporter();

	const err = errorFromWorker({message: 'test'}, {
		file: 'test.js',
		type: 'exception'
	});

	const output = reporter.unhandledError(err, createRunStatus()).split('\n');

	t.is(output[0], colors.red('Uncaught Exception: test.js'));
	t.is(output[1], '  ' + colors.red(JSON.stringify(err)));
	t.end();
});

test('results with passing tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing known failure tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.knownFailureCount = 1;
	runStatus.knownFailures = [{
		title: 'known failure',
		failing: true
	}];

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 known failure'),
		'',
		'',
		'  ' + colors.red('known failure'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.skipCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.yellow('1 test skipped'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.todoCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.blue('1 test todo'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and rejections', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.rejectionCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 unhandled rejection'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests and exceptions', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing tests, rejections and exceptions', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.rejectionCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 unhandled rejection'),
		'  ' + colors.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with errors', t => {
	const error1 = errorFromWorker(new AssertionError({message: 'error one message'}));
	const err1Path = tempWrite.sync('a()');
	error1.source = source(err1Path);
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = errorFromWorker(new AssertionError({message: 'error two message'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.statements = [];
	error2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const error3 = errorFromWorker(new AssertionError({message: 'error three message'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err3Path = tempWrite.sync('b()');
	error3.source = source(err3Path);
	error3.statements = [];
	error3.values = [
		{label: 'error three message:', formatted: JSON.stringify([1])}
	];

	const reporter = createReporter({color: true});
	const runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}, {
		title: 'fail three',
		error: error3
	}];

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 test failed'),
		'',
		'  ' + colors.boldWhite('fail one'),
		'  ' + colors.gray(`${error1.source.file}:${error1.source.line}`),
		'',
		indentString(codeExcerpt(error1.source), 2).split('\n'),
		'',
		/error one message/,
		'',
		'  actual:',
		'',
		'  "abc"',
		'',
		'  expected:',
		'',
		'  "abd"',
		'',
		stackLineRegex, compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + colors.boldWhite('fail two'),
		'  ' + colors.gray(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(error2.source), 2).split('\n'),
		'',
		/error two message/,
		'',
		'  actual:',
		'',
		'  [1]',
		'',
		'  expected:',
		'',
		'  [2]',
		'',
		'',
		'',
		'  ' + colors.boldWhite('fail three'),
		'  ' + colors.gray(`${error3.source.file}:${error3.source.line}`),
		'',
		indentString(codeExcerpt(error3.source), 2).split('\n'),
		'',
		'  error three message:',
		'',
		'  [1]',
		''
	]));
	t.end();
});

test('results with errors and disabled code excerpts', t => {
	const error1 = errorFromWorker(new AssertionError({message: 'error one message'}));
	delete error1.source;
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = errorFromWorker(new AssertionError({message: 'error two message'}), {
		stack: 'error message\nTest.fn (test.js:1:1)\n'
	});
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.statements = [];
	error2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const reporter = createReporter({color: true});
	const runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}];

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 test failed'),
		'',
		'  ' + colors.boldWhite('fail one'),
		'',
		/error one message/,
		'',
		'  actual:',
		'',
		'  "abc"',
		'',
		'  expected:',
		'',
		'  "abd"',
		'',
		stackLineRegex, compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + colors.boldWhite('fail two'),
		'  ' + colors.gray(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(error2.source), 2).split('\n'),
		'',
		/error two message/,
		'',
		'  actual:',
		'',
		'  [1]',
		'',
		'  expected:',
		'',
		'  [2]',
		''
	]));
	t.end();
});

test('results with errors and disabled code excerpts', t => {
	const error1 = errorFromWorker(new AssertionError({message: 'error one message'}));
	const err1Path = tempWrite.sync('a();');
	error1.source = source(err1Path, 10);
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = errorFromWorker(new AssertionError({message: 'error two message'}), {
		stack: 'error message\nTest.fn (test.js:1:1)\n'
	});
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.statements = [];
	error2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const reporter = createReporter({color: true});
	const runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		error: error1
	}, {
		title: 'fail two',
		error: error2
	}];

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 test failed'),
		'',
		'  ' + colors.boldWhite('fail one'),
		'  ' + colors.gray(`${error1.source.file}:${error1.source.line}`),
		'',
		/error one message/,
		'',
		'  actual:',
		'',
		'  "abc"',
		'',
		'  expected:',
		'',
		'  "abd"',
		'',
		stackLineRegex, compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'',
		'',
		'  ' + colors.boldWhite('fail two'),
		'  ' + colors.gray(`${error2.source.file}:${error2.source.line}`),
		'',
		indentString(codeExcerpt(error2.source), 2).split('\n'),
		'',
		/error two message/,
		'',
		'  actual:',
		'',
		'  [1]',
		'',
		'  expected:',
		'',
		'  [2]',
		''
	]));
	t.end();
});

test('results when fail-fast is enabled', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.remainingCount = 1;
	runStatus.failCount = 1;
	runStatus.failFastEnabled = true;
	runStatus.tests = [{
		title: 'failed test'
	}];

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.red('1 test failed'),
		'\n',
		'\n  ' + colors.magenta('`--fail-fast` is on. At least 1 test was skipped.'),
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('results when fail-fast is enabled with multiple skipped tests', t => {
	const reporter = new VerboseReporter({color: true});
	const runStatus = createRunStatus();
	runStatus.remainingCount = 2;
	runStatus.failCount = 1;
	runStatus.failFastEnabled = true;
	runStatus.tests = [{
		title: 'failed test'
	}];

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.red('1 test failed'),
		'\n',
		'\n  ' + colors.magenta('`--fail-fast` is on. At least 2 tests were skipped.'),
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('results without fail-fast if no failing tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.remainingCount = 1;
	runStatus.failCount = 0;
	runStatus.passCount = 1;
	runStatus.failFastEnabled = true;

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results without fail-fast if no skipped tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.remainingCount = 0;
	runStatus.failCount = 1;
	runStatus.failFastEnabled = true;
	runStatus.tests = [{
		title: 'failed test'
	}];

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.red('1 test failed'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results with 1 previous failure', t => {
	const reporter = createReporter();

	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.previousFailCount = 1;

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 uncaught exception'),
		'  ' + colors.red('1 previous failure in test files that were not rerun'),
		''
	]);
	t.end();
});

test('results with 2 previous failures', t => {
	const reporter = createReporter();

	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.exceptionCount = 1;
	runStatus.previousFailCount = 2;

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.green('1 test passed'),
		'  ' + colors.red('1 uncaught exception'),
		'  ' + colors.red('2 previous failures in test files that were not rerun'),
		''
	]);
	t.end();
});

test('full-width line when sectioning', t => {
	const reporter = createReporter();

	const prevColumns = process.stdout.columns;
	process.stdout.columns = 80;
	const output = reporter.section();
	process.stdout.columns = prevColumns;

	t.is(output, colors.dimGray('\u2500'.repeat(80)));
	t.end();
});

test('write calls console.error', t => {
	const stub = sinon.stub(console, 'error');
	const reporter = createReporter();
	reporter.write('result');
	t.true(stub.called);
	console.error.restore();
	t.end();
});

test('reporter.stdout and reporter.stderr both use process.stderr.write', t => {
	const reporter = createReporter();
	const stub = sinon.stub(process.stderr, 'write');
	reporter.stdout('result');
	reporter.stderr('result');
	t.is(stub.callCount, 2);
	process.stderr.write.restore();
	t.end();
});

test('results when hasExclusive is enabled, but there are no known remaining tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.passCount = 1;

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + colors.green('1 test passed'),
		''
	].join('\n');

	t.is(output, expectedOutput);
	t.end();
});

test('results when hasExclusive is enabled, but there is one remaining tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.testCount = 2;
	runStatus.passCount = 1;
	runStatus.failCount = 0;
	runStatus.remainingCount = 1;

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.green('1 test passed'),
		'\n',
		'\n  ' + colors.magenta('The .only() modifier is used in some tests. 1 test was not run'),
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('results when hasExclusive is enabled, but there are multiple remaining tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.testCount = 3;
	runStatus.passCount = 1;
	runStatus.failCount = 0;
	runStatus.remainingCount = 2;

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.green('1 test passed'),
		'\n',
		'\n  ' + colors.magenta('The .only() modifier is used in some tests. 2 tests were not run'),
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('result when no-color flag is set', t => {
	const reporter = new VerboseReporter({color: false, watching: true});
	const runStatus = createRunStatus();
	runStatus.hasExclusive = true;
	runStatus.testCount = 3;
	runStatus.passCount = 1;
	runStatus.failCount = 0;
	runStatus.remainingCount = 2;

	const output = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  1 test passed [17:19:12]',
		'\n',
		'\n  The .only() modifier is used in some tests. 2 tests were not run',
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('timestamp added when watching is enabled', t => {
	const reporter = new VerboseReporter({color: true, watching: true});
	const runStatus = createRunStatus();
	runStatus.testCount = 1;
	runStatus.passCount = 1;
	runStatus.failCount = 0;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = `\n  ${colors.green('1 test passed') + time}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('successful test with logs', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'successful test',
		logs: ['log message 1\nwith a newline', 'log message 2']
	}, {});

	const expectedOutput = [
		'  ' + colors.green(figures.tick) + ' successful test',
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log message 1'),
		'      ' + colors.gray('with a newline'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log message 2')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failed test with logs', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'failed test',
		error: new Error('failure'),
		logs: ['log message 1\nwith a newline', 'log message 2']
	}, {});

	const expectedOutput = [
		'  ' + colors.red(figures.cross) + ' failed test ' + colors.red('failure'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log message 1'),
		'      ' + colors.gray('with a newline'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log message 2')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with errors and logs', t => {
	const error1 = errorFromWorker(new AssertionError({message: 'error one message'}));
	const err1Path = tempWrite.sync('a()');
	error1.source = source(err1Path);
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const reporter = createReporter({color: true});
	const runStatus = createRunStatus();
	runStatus.failCount = 1;
	runStatus.tests = [{
		title: 'fail one',
		logs: ['log from failed test\nwith a newline', 'another log from failed test'],
		error: error1
	}];

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 test failed'),
		'',
		'  ' + colors.boldWhite('fail one'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log from failed test'),
		'      ' + colors.gray('with a newline'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('another log from failed test'),
		'',
		'  ' + colors.gray(`${error1.source.file}:${error1.source.line}`),
		'',
		indentString(codeExcerpt(error1.source), 2).split('\n'),
		'',
		/error one message/,
		'',
		'  actual:',
		'',
		'  "abc"',
		'',
		'  expected:',
		'',
		'  "abd"',
		'',
		stackLineRegex, compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		''
	]));
	t.end();
});
