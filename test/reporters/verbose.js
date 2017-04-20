'use strict';
const indentString = require('indent-string');
const flatten = require('arr-flatten');
const tempWrite = require('temp-write');
const figures = require('figures');
const chalk = require('chalk');
const sinon = require('sinon');
const test = require('tap').test;
const lolex = require('lolex');
const beautifyStack = require('../../lib/beautify-stack');
const colors = require('../../lib/colors');
const VerboseReporter = require('../../lib/reporters/verbose');
const compareLineOutput = require('../helper/compare-line-output');
const codeExcerpt = require('../../lib/code-excerpt');

chalk.enabled = true;

const stackLineRegex = /.+ \(.+:[0-9]+:[0-9]+\)/;

lolex.install(new Date(2014, 11, 19, 17, 19, 12, 200).getTime(), ['Date']);
const time = ' ' + chalk.grey.dim('[17:19:12]');

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

function fooFunc() {
	barFunc();
}

function barFunc() {
	throw new Error();
}

function source(file, line) {
	return {
		file,
		line: line || 1,
		isWithinProject: true,
		isDependency: false
	};
}

test('beautify stack - removes uninteresting lines', t => {
	try {
		fooFunc();
	} catch (err) {
		const stack = beautifyStack(err.stack);
		t.match(stack, /fooFunc/);
		t.match(stack, /barFunc/);
		t.match(err.stack, /Module._compile/);
		t.notMatch(stack, /Module\._compile/);
		t.end();
	}
});

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

	const expectedOutput = '  ' + chalk.green(figures.tick) + ' passed';

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test and duration greater than threshold', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'passed',
		duration: 150
	}, createRunStatus());

	const expectedOutput = '  ' + chalk.green(figures.tick) + ' passed' + chalk.grey.dim(' (150ms)');

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

	const expectedOutput = '  ' + chalk.red(figures.tick) + ' ' + chalk.red('known failure');

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

	const expectedOutput = '  ' + chalk.red(figures.cross) + ' failed ' + chalk.red('assertion failed');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', t => {
	const reporter = createReporter();

	const actualOutput = reporter.test({
		title: 'skipped',
		skip: true
	}, createRunStatus());

	const expectedOutput = '  ' + chalk.yellow('- skipped');

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

	const expectedOutput = '  ' + chalk.blue('- todo');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('uncaught exception', t => {
	const reporter = createReporter();

	const error = new Error('Unexpected token');

	const output = reporter.unhandledError({
		type: 'exception',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, createRunStatus()).split('\n');

	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
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

	t.is(output[0], chalk.red('  ' + figures.cross + ' A futuristic test runner'));
	t.end();
});

test('unhandled rejection', t => {
	const reporter = createReporter();

	const error = new Error('Unexpected token');

	const output = reporter.unhandledError({
		type: 'rejection',
		file: 'test.js',
		stack: beautifyStack(error.stack)
	}, createRunStatus()).split('\n');

	t.is(output[0], chalk.red('Unhandled Rejection: test.js'));
	t.match(output[1], /Error: Unexpected token/);
	t.match(output[2], /test\/reporters\/verbose\.js/);
	t.end();
});

test('unhandled error without stack', t => {
	const reporter = createReporter();

	const err = {
		type: 'exception',
		file: 'test.js',
		message: 'test'
	};

	const output = reporter.unhandledError(err, createRunStatus()).split('\n');

	t.is(output[0], chalk.red('Uncaught Exception: test.js'));
	t.is(output[1], '  ' + chalk.red(JSON.stringify(err)));
	t.end();
});

test('results with passing tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
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

test('results with skipped tests', t => {
	const reporter = createReporter();
	const runStatus = createRunStatus();
	runStatus.passCount = 1;
	runStatus.skipCount = 1;

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.yellow('1 test skipped'),
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
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.blue('1 test todo'),
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
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 unhandled rejection'),
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
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 uncaught exception'),
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
		'  ' + chalk.green('1 test passed') + time,
		'  ' + chalk.red('1 unhandled rejection'),
		'  ' + chalk.red('1 uncaught exception'),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with errors', t => {
	const error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	const err1Path = tempWrite.sync('a()');
	error1.source = source(err1Path);
	error1.avaAssertionError = true;
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.avaAssertionError = true;
	error2.statements = [];
	error2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const error3 = new Error('error three message');
	error3.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err3Path = tempWrite.sync('b()');
	error3.source = source(err3Path);
	error3.avaAssertionError = true;
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
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
		'  ' + chalk.grey(`${error1.source.file}:${error1.source.line}`),
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
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
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
		'  ' + chalk.bold.white('fail three'),
		'  ' + chalk.grey(`${error3.source.file}:${error3.source.line}`),
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
	const error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	error1.avaAssertionError = true;
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.avaAssertionError = true;
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
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
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
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
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
	const error1 = new Error('error one message');
	error1.stack = beautifyStack(error1.stack);
	const err1Path = tempWrite.sync('a();');
	error1.source = source(err1Path, 10);
	error1.avaAssertionError = true;
	error1.statements = [];
	error1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const error2 = new Error('error two message');
	error2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b()');
	error2.source = source(err2Path);
	error2.avaAssertionError = true;
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
		'  ' + chalk.red('1 test failed') + time,
		'',
		'  ' + chalk.bold.white('fail one'),
		'  ' + chalk.grey(`${error1.source.file}:${error1.source.line}`),
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
		'  ' + chalk.bold.white('fail two'),
		'  ' + chalk.grey(`${error2.source.file}:${error2.source.line}`),
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
		'\n  ' + chalk.red('1 test failed') + time,
		'\n',
		'\n  ' + colors.information('`--fail-fast` is on. At least 1 test was skipped.'),
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
		'\n  ' + chalk.red('1 test failed') + time,
		'\n',
		'\n  ' + colors.information('`--fail-fast` is on. At least 2 tests were skipped.'),
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
		'  ' + chalk.green('1 test passed') + time,
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
		'  ' + chalk.red('1 test failed') + time,
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
		'  ' + colors.pass('1 test passed') + time,
		'  ' + colors.error('1 uncaught exception'),
		'  ' + colors.error('1 previous failure in test files that were not rerun'),
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
		'  ' + colors.pass('1 test passed') + time,
		'  ' + colors.error('1 uncaught exception'),
		'  ' + colors.error('2 previous failures in test files that were not rerun'),
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

	t.is(output, chalk.gray.dim('\u2500'.repeat(80)));
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
		'  ' + chalk.green('1 test passed') + time,
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
		'\n  ' + chalk.green('1 test passed') + time,
		'\n',
		'\n  ' + colors.information('The .only() modifier is used in some tests. 1 test was not run'),
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
		'\n  ' + chalk.green('1 test passed') + time,
		'\n',
		'\n  ' + colors.information('The .only() modifier is used in some tests. 2 tests were not run'),
		'\n'
	].join('');

	t.is(output, expectedOutput);
	t.end();
});

test('result when no-color flag is set', t => {
	const reporter = new VerboseReporter({color: false});
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
