'use strict';
const indentString = require('indent-string');
const tempWrite = require('temp-write');
const flatten = require('arr-flatten');
const figures = require('figures');
const chalk = require('chalk');
const sinon = require('sinon');
const test = require('tap').test;
const cross = require('figures').cross;
const lolex = require('lolex');
const AvaError = require('../../lib/ava-error');
const MiniReporter = require('../../lib/reporters/mini');
const beautifyStack = require('../../lib/beautify-stack');
const colors = require('../../lib/colors');
const compareLineOutput = require('../helper/compare-line-output');
const codeExcerpt = require('../../lib/code-excerpt');

chalk.enabled = true;

const graySpinner = chalk.gray.dim(process.platform === 'win32' ? '-' : '⠋');
const stackLineRegex = /.+ \(.+:[0-9]+:[0-9]+\)/;

// Needed because tap doesn't emulate a tty environment and thus this is
// `undefined`, making `cli-truncate` append '...' to test titles
process.stdout.columns = 5000;
const fullWidthLine = chalk.gray.dim('\u2500'.repeat(5000));

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
		'  ' + chalk.green('1 passed')
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
		' ' + graySpinner + ' ' + chalk.red('known failure'),
		'',
		'  ' + chalk.green('1 passed'),
		'  ' + chalk.red('1 known failure')
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
		' ' + graySpinner + ' ' + chalk.red('failed'),
		'',
		'  ' + chalk.red('1 failed')
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
		' ' + graySpinner + ' ' + chalk.red('known failure'),
		'',
		'  ' + chalk.red('1 failed')
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
		'  ' + chalk.green('1 passed'),
		'  ' + chalk.red('1 failed')
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
		' ' + graySpinner + ' ' + chalk.red('failed'),
		'',
		'  ' + chalk.green('1 passed'),
		'  ' + chalk.red('1 failed')
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
	const expectedOutput = `\n  ${chalk.green('1 passed')}\n`;

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
		'\n  ' + chalk.green('1 passed'),
		'\n  ' + chalk.red('1 known failure'),
		'\n',
		'\n   ' + chalk.bold.white('known failure'),
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
	const expectedOutput = `\n  ${chalk.yellow('1 skipped')}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with todo tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 0;
	reporter.todoCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${chalk.blue('1 todo')}\n`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results with passing skipped tests', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.skipCount = 1;

	const output = reporter.finish({}).split('\n');

	t.is(output[0], '');
	t.is(output[1], '  ' + chalk.green('1 passed'));
	t.is(output[2], '  ' + chalk.yellow('1 skipped'));
	t.is(output[3], '');
	t.end();
});

test('results with passing tests and rejections', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.rejectionCount = 1;

	const err1 = new Error('failure one');
	err1.type = 'rejection';
	err1.stack = beautifyStack(err1.stack);
	const err2 = new Error('failure two');
	err2.type = 'rejection';
	err2.stack = 'stack line with trailing whitespace\t\n';

	const runStatus = {
		errors: [err1, err2]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + chalk.green('1 passed'),
		'  ' + chalk.red('1 rejection'),
		'',
		'  ' + chalk.bold.white('Unhandled Rejection'),
		/Error: failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'  ' + chalk.bold.white('Unhandled Rejection'),
		'  ' + colors.stack('stack line with trailing whitespace'),
		''
	]);
	t.end();
});

test('results with passing tests and exceptions', t => {
	const reporter = miniReporter();
	reporter.passCount = 1;
	reporter.exceptionCount = 2;

	const err = new Error('failure');
	err.type = 'exception';
	err.stack = beautifyStack(err.stack);

	const avaErr = new AvaError('A futuristic test runner');
	avaErr.type = 'exception';

	const runStatus = {
		errors: [err, avaErr]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + chalk.green('1 passed'),
		'  ' + chalk.red('2 exceptions'),
		'',
		'  ' + chalk.bold.white('Uncaught Exception'),
		/Error: failure/,
		/test\/reporters\/mini\.js/,
		compareLineOutput.SKIP_UNTIL_EMPTY_LINE,
		'',
		'  ' + chalk.red(cross + ' A futuristic test runner'),
		''
	]);
	t.end();
});

test('results with errors', t => {
	const err1 = new Error('failure one');
	err1.stack = beautifyStack(err1.stack);
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path);
	err1.avaAssertionError = true;
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc') + '\n'},
		{label: 'expected:', formatted: JSON.stringify('abd') + '\n'}
	];

	const err2 = new Error('failure two');
	err2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.avaAssertionError = true;
	err2.statements = [];
	err2.values = [
		{label: 'actual:', formatted: JSON.stringify([1]) + '\n'},
		{label: 'expected:', formatted: JSON.stringify([2]) + '\n'}
	];

	const err3 = new Error('failure three');
	err3.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err3Path = tempWrite.sync('c();');
	err3.source = source(err3Path);
	err3.avaAssertionError = true;
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
		'  ' + chalk.red('1 failed'),
		'',
		'  ' + chalk.bold.white('failed one'),
		'  ' + chalk.grey(`${err1.source.file}:${err1.source.line}`),
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
		'  ' + chalk.bold.white('failed two'),
		'  ' + chalk.grey(`${err2.source.file}:${err2.source.line}`),
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
		'  ' + chalk.bold.white('failed three'),
		'  ' + chalk.grey(`${err3.source.file}:${err3.source.line}`),
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
	const err1 = new Error('failure one');
	err1.stack = beautifyStack(err1.stack);
	err1.avaAssertionError = true;
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const err2 = new Error('failure two');
	err2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.avaAssertionError = true;
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
		'  ' + chalk.red('1 failed'),
		'',
		'  ' + chalk.bold.white('failed one'),
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
		'  ' + chalk.bold.white('failed two'),
		'  ' + chalk.grey(`${err2.source.file}:${err2.source.line}`),
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
	const err1 = new Error('failure one');
	err1.stack = beautifyStack(err1.stack);
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path, 10);
	err1.avaAssertionError = true;
	err1.statements = [];
	err1.values = [
		{label: 'actual:', formatted: JSON.stringify('abc')},
		{label: 'expected:', formatted: JSON.stringify('abd')}
	];

	const err2 = new Error('failure two');
	err2.stack = 'error message\nTest.fn (test.js:1:1)\n';
	const err2Path = tempWrite.sync('b();');
	err2.source = source(err2Path);
	err2.avaAssertionError = true;
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
		'  ' + chalk.red('1 failed'),
		'',
		'  ' + chalk.bold.white('failed one'),
		'  ' + chalk.grey(`${err1.source.file}:${err1.source.line}`),
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
		'  ' + chalk.bold.white('failed two'),
		'  ' + chalk.grey(`${err2.source.file}:${err2.source.line}`),
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

	const err = new Error('failure one');
	err.stack = beautifyStack(err.stack);

	const runStatus = {
		errors: [
			{title: 'failed one', error: err},
			{title: 'failed two'}
		]
	};

	const output = reporter.finish(runStatus);
	compareLineOutput(t, output, [
		'',
		'  ' + chalk.red('2 failed'),
		'',
		'  ' + chalk.bold.white('failed one'),
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
		'  ' + colors.information('`--fail-fast` is on. At least 1 test was skipped.'),
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
		'  ' + colors.information('`--fail-fast` is on. At least 2 tests were skipped.'),
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
		'  ' + colors.todo('1 todo'),
		'  ' + colors.error('1 previous failure in test files that were not rerun'),
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
		'  ' + colors.todo('1 todo'),
		'  ' + colors.error('2 previous failures in test files that were not rerun'),
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
	const time = ' ' + chalk.grey.dim('[17:19:12]');

	const reporter = miniReporter({color: true, watching: true});
	reporter.passCount = 1;
	reporter.failCount = 0;

	const actualOutput = reporter.finish({});
	const expectedOutput = `\n  ${chalk.green('1 passed') + time}\n`;

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
	const expectedOutput = `\n  ${colors.error('1 failed')}\n`;
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
	const expectedOutput = `\n  ${colors.error('1 rejection')}\n`;
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('returns description based on error itself if no stack available', t => {
	const reporter = miniReporter();
	reporter.exceptionCount = 1;
	const err1 = new Error('failure one');
	const runStatus = {
		errors: [{
			error: err1
		}]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.error('1 exception'),
		'\n',
		'\n  ' + colors.title('Uncaught Exception'),
		'\n  ' + colors.stack('Threw non-error: ' + JSON.stringify({error: err1})),
		'\n'
	].join('');
	t.is(actualOutput, expectedOutput);
	t.end();
});

test('shows "non-error" hint for invalid throws', t => {
	const reporter = miniReporter();
	reporter.exceptionCount = 1;
	const err = {type: 'exception', message: 'function fooFn() {}', stack: 'function fooFn() {}'};
	const runStatus = {
		errors: [err]
	};
	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'\n  ' + colors.error('1 exception'),
		'\n',
		'\n  ' + colors.title('Uncaught Exception'),
		'\n  ' + colors.stack('Threw non-error: function fooFn() {}'),
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
		'  ' + colors.information('The .only() modifier is used in some tests. 1 test was not run') +
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
		'  ' + colors.information('The .only() modifier is used in some tests. 2 tests were not run') +
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
	const err1 = new Error('failure one');
	err1.stack = beautifyStack(err1.stack);
	const err1Path = tempWrite.sync('a();');
	err1.source = source(err1Path);
	err1.avaAssertionError = true;
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
		'  ' + chalk.red('1 failed'),
		'',
		'  ' + chalk.bold.white('failed one'),
		'    ' + chalk.magenta(figures.info) + ' ' + chalk.gray('log from a failed test'),
		'      ' + chalk.gray('with a newline'),
		'    ' + chalk.magenta(figures.info) + ' ' + chalk.gray('another log from failed test'),
		'',
		'  ' + chalk.grey(`${err1.source.file}:${err1.source.line}`),
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
