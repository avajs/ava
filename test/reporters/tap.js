'use strict';
const sinon = require('sinon');
const test = require('tap').test;
const hasAnsi = require('has-ansi');
const colors = require('../helper/colors');
const TapReporter = require('../../lib/reporters/tap');

test('start', t => {
	const reporter = new TapReporter();

	t.is(reporter.start(), 'TAP version 13');
	t.end();
});

test('passing test', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'passing'
	});

	const expectedOutput = [
		'# passing',
		'ok 1 - passing'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'failing',
		error: {
			name: 'AssertionError',
			message: 'false == true',
			avaAssertionError: true,
			assertion: 'true',
			operator: '==',
			values: [{label: 'expected:', formatted: 'true'}, {label: 'actual:', formatted: 'false'}],
			stack: 'Test.fn (test.js:1:2)'
		}
	});

	const expectedOutput = `# failing
not ok 1 - failing
  ---
    name: AssertionError
    message: false == true
    assertion: 'true'
    operator: ==
    values:
      'expected:': 'true'
      'actual:': 'false'
    at: 'Test.fn (test.js:1:2)'
  ...`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('multiline strings in YAML block', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'multiline',
		error: {
			object: {
				foo: 'hello\nworld'
			}
		}
	});

	const expectedOutput = `# multiline
not ok 1 - multiline
  ---
    foo: |-
      hello
      world
  ...`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('strips ANSI from actual and expected values', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'strip ansi',
		error: {
			avaAssertionError: true,
			values: [{label: 'value', formatted: '\u001B[31mhello\u001B[39m'}]
		}
	});

	const expectedOutput = `# strip ansi
not ok 1 - strip ansi
  ---
    values:
      value: hello
  ...`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('unhandled error', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.unhandledError({
		message: 'unhandled',
		name: 'TypeError',
		stack: 'Test.fn (test.js:1:2)'
	});

	const expectedOutput = `# unhandled
not ok 1 - unhandled
  ---
    name: TypeError
    at: 'Test.fn (test.js:1:2)'
  ...`;

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('ava error', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.unhandledError({
		type: 'exception',
		name: 'AvaError',
		message: 'A futuristic test runner'
	});

	const expectedOutput = [
		'# A futuristic test runner',
		'not ok 1 - A futuristic test runner'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results', t => {
	const reporter = new TapReporter();
	const runStatus = {
		passCount: 1,
		failCount: 2,
		skipCount: 1,
		rejectionCount: 3,
		exceptionCount: 4
	};

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'1..' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
		'# tests ' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
		'# pass ' + runStatus.passCount,
		'# skip ' + runStatus.skipCount,
		'# fail ' + (runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results does not show skipped tests if there are none', t => {
	const reporter = new TapReporter();
	const runStatus = {
		passCount: 1,
		failCount: 2,
		skipCount: 0,
		rejectionCount: 3,
		exceptionCount: 4
	};

	const actualOutput = reporter.finish(runStatus);
	const expectedOutput = [
		'',
		'1..' + (runStatus.passCount + runStatus.failCount),
		'# tests ' + (runStatus.passCount + runStatus.failCount),
		'# pass ' + runStatus.passCount,
		'# fail ' + (runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('todo test', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'should think about doing this',
		passed: false,
		skip: true,
		todo: true
	});

	const expectedOutput = [
		'# should think about doing this',
		'not ok 1 - should think about doing this # TODO'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skip test', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'skipped',
		passed: true,
		skip: true
	});

	const expectedOutput = [
		'# skipped',
		'ok 1 - skipped # SKIP'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('reporter strips ANSI characters', t => {
	const reporter = new TapReporter();

	const output = reporter.test({
		title: `test ${colors.dimGray('›')} my test`,
		type: 'test',
		file: 'test.js'
	});

	t.notOk(hasAnsi(output.title));
	t.end();
});

test('write should call console.log', t => {
	const reporter = new TapReporter();
	const stub = sinon.stub(console, 'log');

	reporter.write('result');

	t.true(stub.called);
	console.log.restore();
	t.end();
});

test('stdout and stderr should call process.stderr.write', t => {
	const reporter = new TapReporter();
	const stub = sinon.stub(process.stderr, 'write');

	reporter.stdout('result');
	reporter.stderr('result');

	process.stderr.write.restore();
	t.is(stub.callCount, 2);
	t.end();
});

test('successful test with logs', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'passing',
		logs: ['log message 1\nwith a newline', 'log message 2']
	});

	const expectedOutput = [
		'# passing',
		'ok 1 - passing',
		'  * log message 1',
		'    with a newline',
		'  * log message 2'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test with logs', t => {
	const reporter = new TapReporter();

	const actualOutput = reporter.test({
		title: 'failing',
		error: {
			name: 'AssertionError',
			message: 'false == true'
		},
		logs: ['log message 1\nwith a newline', 'log message 2']
	});

	const expectedOutput = [
		'# failing',
		'not ok 1 - failing',
		'  * log message 1',
		'    with a newline',
		'  * log message 2',
		'  ---',
		'    name: AssertionError',
		'    message: false == true',
		'  ...'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});
