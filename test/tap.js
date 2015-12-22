'use strict';
var test = require('tap').test;
var tap = require('../lib/tap');

test('start', function (t) {
	t.is(tap.start(), 'TAP version 13');
	t.end();
});

test('passing test', function (t) {
	var actualOutput = tap.test({
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
	var actualOutput = tap.test({
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
		'not ok 2 - false == true',
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
	var actualOutput = tap.unhandledError({
		message: 'unhandled',
		name: 'TypeError',
		stack: ['', ' at Test.fn (test.js:1:2)'].join('\n')
	});

	var expectedOutput = [
		'# unhandled',
		'not ok 3 - unhandled',
		'  ---',
		'    name: TypeError',
		'    at: Test.fn (test.js:1:2)',
		'  ...'
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});

test('results', function (t) {
	var passCount = 1;
	var failCount = 2;
	var rejectionCount = 3;
	var exceptionCount = 4;

	var actualOutput = tap.finish(passCount, failCount, rejectionCount, exceptionCount);
	var expectedOutput = [
		'',
		'1..' + (passCount + failCount),
		'# tests ' + (passCount + failCount),
		'# pass ' + passCount,
		'# fail ' + (failCount + rejectionCount + exceptionCount),
		''
	].join('\n');

	t.is(actualOutput, expectedOutput);
	t.end();
});
