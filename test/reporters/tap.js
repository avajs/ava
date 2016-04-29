'use strict';
var test = require('tap').test;
var hasAnsi = require('has-ansi');
var tapReporter = require('../../lib/reporters/tap');

test('start', function (t) {
	var reporter = tapReporter();

	t.is(reporter.start(), 'TAP version 13');
	t.end();
});

test('passing test', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.test({
		title: 'passing'
	});

	var expectedOutput = [
		'# passing',
		'ok 1 - passing'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('failing test', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.test({
		title: 'failing',
		error: {
			message: 'false == true',
			operator: '==',
			expected: true,
			actual: false,
			stack: ['', 'Test.fn (test.js:1:2)'].join('\n')
		}
	});

	var expectedOutput = [
		'# failing',
		'not ok 1 - failing',
		'  ---',
		'    operator: ==',
		'    expected: true',
		'    actual: false',
		'    at: Test.fn (test.js:1:2)',
		'  ...'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('unhandled error', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.unhandledError({
		message: 'unhandled',
		name: 'TypeError',
		stack: ['', 'Test.fn (test.js:1:2)'].join('\n')
	});

	var expectedOutput = [
		'# unhandled',
		'not ok 1 - unhandled',
		'  ---',
		'    name: TypeError',
		'    at: Test.fn (test.js:1:2)',
		'  ...'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('ava error', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.unhandledError({
		type: 'exception',
		name: 'AvaError',
		message: 'A futuristic test runner'
	});

	var expectedOutput = [
		'# A futuristic test runner',
		'not ok 1 - A futuristic test runner'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results', function (t) {
	var reporter = tapReporter();
	var runStatus = {
		passCount: 1,
		failCount: 2,
		skipCount: 1,
		rejectionCount: 3,
		exceptionCount: 4
	};

	var actualOutput = reporter.finish(runStatus);
	var expectedOutput = [
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

test('results does not show skipped tests if there are none', function (t) {
	var reporter = tapReporter();
	var runStatus = {
		passCount: 1,
		failCount: 2,
		skipCount: 0,
		rejectionCount: 3,
		exceptionCount: 4
	};

	var actualOutput = reporter.finish(runStatus);
	var expectedOutput = [
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

test('todo test', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.test({
		title: 'should think about doing this',
		passed: false,
		skip: true,
		todo: true
	});

	var expectedOutput = [
		'# should think about doing this',
		'not ok 1 - should think about doing this # TODO'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('skip test', function (t) {
	var reporter = tapReporter();

	var actualOutput = reporter.test({
		title: 'skipped',
		passed: true,
		skip: true
	});

	var expectedOutput = [
		'# skipped',
		'ok 1 - skipped # SKIP'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('reporter strips ANSI characters', function (t) {
	var reporter = tapReporter();

	var test = {
	  title: 'test \u001b[90m\u001b[2m›\u001b[22m\u001b[39m my test',
	  type: 'test',
	  file: 'test.js'
	};

	var output = reporter.test(test)

	t.notOk(hasAnsi(output.title));
	t.end();
});
