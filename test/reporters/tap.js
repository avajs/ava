'use strict';
var test = require('tap').test;
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
			stack: ['', '', '', ' at Test.fn (test.js:1:2)'].join('\n')
		}
	});

	var expectedOutput = [
		'# failing',
		'not ok 1 - false == true',
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
		stack: ['', ' at Test.fn (test.js:1:2)'].join('\n')
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

test('results', function (t) {
	var reporter = tapReporter();
	var api = {
		passCount: 1,
		failCount: 2,
		skipCount: 1,
		rejectionCount: 3,
		exceptionCount: 4
	};

	reporter.api = api;

	var actualOutput = reporter.finish();
	var expectedOutput = [
		'',
		'1..' + (api.passCount + api.failCount + api.skipCount),
		'# tests ' + (api.passCount + api.failCount + api.skipCount),
		'# pass ' + api.passCount,
		'# skip ' + api.skipCount,
		'# fail ' + (api.failCount + api.rejectionCount + api.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results does not show skipped tests if there are none', function (t) {
	var reporter = tapReporter();
	var api = {
		passCount: 1,
		failCount: 2,
		skipCount: 0,
		rejectionCount: 3,
		exceptionCount: 4
	};

	reporter.api = api;

	var actualOutput = reporter.finish();
	var expectedOutput = [
		'',
		'1..' + (api.passCount + api.failCount),
		'# tests ' + (api.passCount + api.failCount),
		'# pass ' + api.passCount,
		'# fail ' + (api.failCount + api.rejectionCount + api.exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});
