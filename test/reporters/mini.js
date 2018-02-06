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
const tempWrite = require('temp-write');
const flatten = require('arr-flatten');
const figures = require('figures');
const sinon = require('sinon');
const test = require('tap').test;
const cross = require('figures').cross;
const lolex = require('lolex');
const AvaError = require('../../lib/ava-error');
const AssertionError = require('../../lib/assert').AssertionError;
const MiniReporter = require('../../lib/reporters/mini');
const colors = require('../helper/colors');
const compareLineOutput = require('../helper/compare-line-output');
const errorFromWorker = require('../helper/error-from-worker');
const codeExcerpt = require('../../lib/code-excerpt');

const graySpinner = colors.dimGray(process.platform === 'win32' ? '-' : '⠋');
const stackLineRegex = /.+ \(.+:\d+:\d+\)/;

// Needed because tap doesn't emulate a tty environment and thus this is
// `undefined`, making `cli-truncate` append '...' to test titles
process.stdout.columns = 5000;
const fullWidthLine = colors.dimGray('\u2500'.repeat(5000));

function miniReporter(options) {
	if (options === undefined) {
		options = {color: true};
	}
	const reporter = new MiniReporter(options);
	reporter.start = () => '';
	return reporter;
}

function source(file, line) {
	return {
		file,
		line: line || 1,
		isWithinProject: true,
		isDependency: false
	};
}

process.stderr.setMaxListeners(50);

test('start', t => {
	const reporter = new MiniReporter({color: true});

	t.is(reporter.start(), ' \n ' + graySpinner + ' ');
	reporter.clearInterval();
	t.end();
});

test('passing test', t => {
	const reporter = miniReporter();

	const actualOutput = reporter.test({
		title: 'passed'
	});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' passed',
		'',
		'  ' + colors.green('1 passed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('known failure test', t => {
	const reporter = miniReporter();

	const actualOutput = reporter.test({
		title: 'known failure',
		failing: true
	});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + colors.red('known failure'),
		'',
		'  ' + colors.green('1 passed'),
		'  ' + colors.red('1 known failure')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', t => {
	const reporter = miniReporter();

	const actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + colors.red('failed'),
		'',
		'  ' + colors.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failed known failure test', t => {
	const reporter = miniReporter();

	const actualOutput = reporter.test({
		title: 'known failure',
		failing: true,
		error: {
			message: 'Test was expected to fail, but succeeded, you should stop marking the test as failing'
		}
	});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + colors.red('known failure'),
		'',
		'  ' + colors.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('passing test after failing', t => {
	const reporter = miniReporter();

	reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	const actualOutput = reporter.test({title: 'passed'});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' passed',
		'',
		'  ' + colors.green('1 passed'),
		'  ' + colors.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test after passing', t => {
	const reporter = miniReporter();

	reporter.test({title: 'passed'});

	const actualOutput = reporter.test({
		title: 'failed',
		error: {
			message: 'assertion failed'
		}
	});

	const expectedOutput = [
		' ',
		' ' + graySpinner + ' ' + colors.red('failed'),
		'',
		'  ' + colors.green('1 passed'),
		'  ' + colors.red('1 failed')
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skipped test', t => {
	const reporter = miniReporter();

	const output = reporter.test({
		title: 'skipped',
		skip: true
	});

	t.false(output);
	t.end();
});

test('todo test', t => {
	const reporter = miniReporter();

	const output = reporter.test({
		title: 'todo',
		skip: true,
		todo: true
	});

	t.false(output);
	t.end();
});

test('results with passing tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${colors.green('1 passed')}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing known failure tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.knownFailureCount = 1;
	reporter.failCount = 0;

	const runStatus = {
		knownFailures: [{
			title: 'known failure',
			failing: true
		}]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.green('1 passed'),
		'\n  ' + colors.red('1 known failure'),
		'\n',
		'\n   ' + colors.boldWhite('known failure'),
		'\n'
	].join('');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with skipped tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 0;
	reporter.skipCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${colors.yellow('1 skipped')}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 0;
	reporter.todoCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${colors.blue('1 todo')}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing skipped tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.skipCount = 1;

	const output = reporter.finish({}).split('\n');

	t.is(output[0], '');
	t.is(output[1], '  ' + colors.green('1 passed'));
	t.is(output[2], '  ' + colors.yellow('1 skipped'));
	t.is(output[3], '');
	t.end();
});

test('results with passing tests and rejections', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.rejectionCount = 1;

	const err1 = errorFromWorker(new Error('failure one'), {type: 'rejection'});
	const err2 = errorFromWorker(new Error('failure two'), {
		type: 'rejection',
		stack: 'Error: failure two\n    at trailingWhitespace (test.js:1:1)\r\n'
	});

	const runStatus = {
		errors: [err1, err2]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.green('1 passed'),
		'  ' + colors.red('1 rejection'),
		'',
		'  ' + colors.boldWhite('Unhandled Rejection'),
		/Error: failure one/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'  ' + colors.boldWhite('Unhandled Rejection'),
		/Error: failure two/,
		/trailingWhitespace/,
		''
	]);
	t.end();
});

test('results with passing tests and exceptions', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.exceptionCount = 2;

	const err = errorFromWorker(new Error('failure'), {type: 'exception'});

	const avaErr = errorFromWorker(new AvaError('A futuristic test runner'), {type: 'exception'});

	const runStatus = {
		errors: [err, avaErr]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.green('1 passed'),
		'  ' + colors.red('2 exceptions'),
		'',
		'  ' + colors.boldWhite('Uncaught Exception'),
		/Error: failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'  ' + colors.red(cross + ' A futuristic test runner'),
		''
	]);
	t.end();
});

test('results with errors', t => {
	const err1 = errorFromWorker(new AssertionError({message: 'failure one'}));
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path);
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc') + '\n'},
		{label: 'expected:', formatted: JSON.stringify('abd') + '\n'}
	];

	const err2 = errorFromWorker(new AssertionError({message: 'failure two'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.statements = [];
	err2.values = [
		{label: 'actual:', formatted: JSON.stringify([1]) + '\n'},
		{label: 'expected:', formatted: JSON.stringify([2]) + '\n'}
	];

	const err3 = errorFromWorker(new AssertionError({message: 'failure three'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err3Path = tempWrite.sync('c();');
	err3.source = source(err3Path);
	err3.statements = [];
	err3.values = [
		{label: 'failure three:', formatted: JSON.stringify([1]) + '\n'}
	];

	const reporter = miniReporter();
	reporter.failCount = 1;

	const runStatus = {
		errors: [{
			title: 'failed one',
			error: err1
		}, {
			title: 'failed two',
			error: err2
		}, {
			title: 'failed three',
			error: err3
		}]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 failed'),
		'',
		'  ' + colors.boldWhite('failed one'),
		'  ' + colors.gray(`${err1.source.file}:${err1.source.line}`),
		'',
		indentString(codeExcerpt(err1.source), 2).split('\n'),
		'',
		/failure one/,
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
		'  ' + colors.boldWhite('failed two'),
		'  ' + colors.gray(`${err2.source.file}:${err2.source.line}`),
		'',
		indentString(codeExcerpt(err2.source), 2).split('\n'),
		'',
		/failure two/,
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
		'  ' + colors.boldWhite('failed three'),
		'  ' + colors.gray(`${err3.source.file}:${err3.source.line}`),
		'',
		indentString(codeExcerpt(err3.source), 2).split('\n'),
		'',
		'  failure three:',
		'',
		'  [1]',
		''
	]));
	t.end();
});

test('results with errors and disabled code excerpts', t => {
	const err1 = errorFromWorker(new AssertionError({message: 'failure one'}));
	delete err1.source;
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const err2 = errorFromWorker(new AssertionError({message: 'failure two'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.statements = [];
	err2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const reporter = miniReporter({color: true});
	reporter.failCount = 1;

	const runStatus = {
		errors: [{
			title: 'failed one',
			error: err1
		}, {
			title: 'failed two',
			error: err2
		}]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 failed'),
		'',
		'  ' + colors.boldWhite('failed one'),
		'',
		/failure one/,
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
		'  ' + colors.boldWhite('failed two'),
		'  ' + colors.gray(`${err2.source.file}:${err2.source.line}`),
		'',
		indentString(codeExcerpt(err2.source), 2).split('\n'),
		'',
		/failure two/,
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

test('results with errors and broken code excerpts', t => {
	const err1 = errorFromWorker(new AssertionError({message: 'failure one'}));
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path, 10);
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const err2 = errorFromWorker(new AssertionError({message: 'failure two'}), {
		stack: 'error message\nTest.fn (test.js:1:1)'
	});
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.statements = [];
	err2.values = [
		{label: 'actual:', formatted: JSON.stringify([1])},
		{label: 'expected:', formatted: JSON.stringify([2])}
	];

	const reporter = miniReporter({color: true});
	reporter.failCount = 1;

	const runStatus = {
		errors: [{
			title: 'failed one',
			error: err1
		}, {
			title: 'failed two',
			error: err2
		}]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 failed'),
		'',
		'  ' + colors.boldWhite('failed one'),
		'  ' + colors.gray(`${err1.source.file}:${err1.source.line}`),
		'',
		/failure one/,
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
		'  ' + colors.boldWhite('failed two'),
		'  ' + colors.gray(`${err2.source.file}:${err2.source.line}`),
		'',
		indentString(codeExcerpt(err2.source), 2).split('\n'),
		'',
		/failure two/,
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

test('results with unhandled errors', t => {
	const reporter = miniReporter();
	reporter.failCount = 2;

	const err = errorFromWorker(new Error('failure one'));
	delete err.source;

	const runStatus = {
		errors: [
			{title: 'failed one', error: err},
			{title: 'failed two'}
		]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.red('2 failed'),
		'',
		'  ' + colors.boldWhite('failed one'),
		'',
		/failure one/,
		'',
		stackLineRegex, compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		''
	]);
	t.end();
});

test('results when fail-fast is enabled', t => {
	const reporter = miniReporter();
	const runStatus = {
		remainingCount: 1,
		failCount: 1,
		failFastEnabled: true
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.magenta('`--fail-fast` is on. At least 1 test was skipped.'),
		''
	]);
	t.end();
});

test('results when fail-fast is enabled with multiple skipped tests', t => {
	const reporter = miniReporter();
	const runStatus = {
		remainingCount: 2,
		failCount: 1,
		failFastEnabled: true
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.magenta('`--fail-fast` is on. At least 2 tests were skipped.'),
		''
	]);
	t.end();
});

test('results without fail-fast if no failing tests', t => {
	const reporter = miniReporter();
	const runStatus = {
		remainingCount: 1,
		failCount: 0,
		failFastEnabled: true
	};

	const output = reporter.finish(runStatus);
	t.is(output, '\n\n');
	t.end();
});

test('results without fail-fast if no skipped tests', t => {
	const reporter = miniReporter();
	const runStatus = {
		remainingCount: 0,
		failCount: 1,
		failFastEnabled: true
	};

	const output = reporter.finish(runStatus);
	t.is(output, '\n\n');
	t.end();
});

test('results with 1 previous failure', t => {
	const reporter = miniReporter();
	reporter.todoCount = 1;

	const runStatus = {
		previousFailCount: 1
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.blue('1 todo'),
		'  ' + colors.red('1 previous failure in test files that were not rerun'),
		''
	]);
	t.end();
});

test('results with 2 previous failures', t => {
	const reporter = miniReporter();
	reporter.todoCount = 1;

	const runStatus = {
		previousFailCount: 2
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + colors.blue('1 todo'),
		'  ' + colors.red('2 previous failures in test files that were not rerun'),
		''
	]);
	t.end();
});

test('empty results after reset', t => {
	const reporter = miniReporter();

	reporter.failCount = 1;
	reporter.reset();

	const output = reporter.finish({});
	t.is(output, '\n\n');
	t.end();
});

test('full-width line when sectioning', t => {
	const reporter = miniReporter();

	const output = reporter.section();
	t.is(output, '\n' + fullWidthLine);
	t.end();
});

test('results with watching enabled', t => {
	lolex.install({
		now: new Date(2014, 11, 19, 17, 19, 12, 200).getTime(),
		toFake: [
			'Date'
		]
	});
	const time = ' ' + colors.dimGray('[17:19:12]');

	const reporter = miniReporter({color: true, watching: true});
	reporter.passCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${colors.green('1 passed') + time}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('increases number of rejections', t => {
	const reporter = miniReporter();
	reporter.passCount = 0;
	reporter.rejectionCount = 0;
	const err = new Error('failure one');
	err.type = 'rejection';
	reporter.unhandledError(err);
	t.is(reporter.rejectionCount, 1);
	t.end();
});

test('increases number of exceptions', t => {
	const reporter = miniReporter();
	reporter.passCount = 0;
	reporter.exceptionCount = 0;
	const err = new Error('failure one');
	err.type = 'exception';
	reporter.unhandledError(err);
	t.is(reporter.exceptionCount, 1);
	t.end();
});

test('silently handles errors without body', t => {
	const reporter = miniReporter();
	reporter.failCount = 1;
	const runStatus = {
		errors: [{}, {}]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = `\n  ${colors.red('1 failed')}\n`;
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('does not handle errors with body in rejections', t => {
	const reporter = miniReporter();
	reporter.rejectionCount = 1;
	const runStatus = {
		errors: [{
			title: 'failed test'
		}]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = `\n  ${colors.red('1 rejection')}\n`;
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('returns description based on error itself if no stack available', t => {
	const reporter = miniReporter();
	reporter.exceptionCount = 1;
	const thrownValue = {message: 'failure one'};
	const err1 = errorFromWorker(thrownValue);
	const runStatus = {
		errors: [err1]
	};
	const actualOutput = reporter.finish(runStatus);
	console.log(actualOutput);
	const expectedOutput = [
		'\n  ' + colors.red('1 exception'),
		'\n',
		'\n  ' + colors.boldWhite('Uncaught Exception'),
		'\n  Threw non-error: ' + JSON.stringify(thrownValue),
		'\n'
	].join('');
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('shows "non-error" hint for invalid throws', t => {
	const reporter = miniReporter();
	reporter.exceptionCount = 1;
	const err = errorFromWorker({type: 'exception', message: 'function fooFn() {}', stack: 'function fooFn() {}'});
	const runStatus = {
		errors: [err]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.red('1 exception'),
		'\n',
		'\n  ' + colors.boldWhite('Uncaught Exception'),
		'\n  Threw non-error: function fooFn() {}',
		'\n'
	].join('');
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('returns empty string (used in watcher in order to separate different test runs)', t => {
	const reporter = miniReporter();
	t.is(reporter.clear(), '');
	t.end();
});

test('stderr and stdout should call _update', t => {
	const reporter = miniReporter();
	const spy = sinon.spy(reporter, '_update');
	reporter.stdout();
	reporter.stderr();
	t.is(spy.callCount, 2);
	reporter._update.restore();
	t.end();
});

test('results when hasExclusive is enabled, but there are no known remaining tests', t => {
	const reporter = miniReporter();
	const runStatus = {
		hasExclusive: true
	};

	const output = reporter.finish(runStatus);
	t.is(output, '\n\n');
	t.end();
});

test('results when hasExclusive is enabled, but there is one remaining tests', t => {
	const reporter = miniReporter();

	const runStatus = {
		hasExclusive: true,
		testCount: 2,
		passCount: 1,
		remainingCount: 1
	};

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = '\n' +
		'  ' + colors.magenta('The .only() modifier is used in some tests. 1 test was not run') +
		'\n';
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results when hasExclusive is enabled, but there are multiple remaining tests', t => {
	const reporter = miniReporter();

	const runStatus = {
		hasExclusive: true,
		testCount: 3,
		passCount: 1,
		remainingCount: 2
	};

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = '\n' +
		'  ' + colors.magenta('The .only() modifier is used in some tests. 2 tests were not run') +
		'\n';
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('result when no-color flag is set', t => {
	const reporter = miniReporter({
		color: false
	});

	const runStatus = {
		hasExclusive: true,
		testCount: 3,
		passCount: 1,
		failCount: 0,
		remainingCount: 2
	};

	const output = reporter.finish(runStatus);
	const expectedOutput = '\n' +
		'  The .only() modifier is used in some tests. 2 tests were not run' +
		'\n';
	t.is(output, expectedOutput);
	t.end();
});

test('results with errors and logs', t => {
	const err1 = errorFromWorker(new AssertionError({message: 'failure one'}));
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path);
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc') + '\n'},
		{label: 'expected:', formatted: JSON.stringify('abd') + '\n'}
	];

	const reporter = miniReporter();
	reporter.failCount = 1;

	const runStatus = {
		errors: [{
			title: 'failed one',
			logs: ['log from a failed test\nwith a newline', 'another log from failed test'],
			error: err1
		}]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, flatten([
		'',
		'  ' + colors.red('1 failed'),
		'',
		'  ' + colors.boldWhite('failed one'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('log from a failed test'),
		'      ' + colors.gray('with a newline'),
		'    ' + colors.magenta(figures.info) + ' ' + colors.gray('another log from failed test'),
		'',
		'  ' + colors.gray(`${err1.source.file}:${err1.source.line}`),
		'',
		indentString(codeExcerpt(err1.source), 2).split('\n'),
		'',
		/failure one/,
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
