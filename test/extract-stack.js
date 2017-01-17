'use strict';
const test = require('tap').test;
const extractStack = require('../lib/extract-stack');

test('strip error message', t => {
	const stack = [
		'error message',
		'Test.t (test.js:1:1)'
	].join('\n');

	t.is(extractStack(stack), 'Test.t (test.js:1:1)');
	t.end();
});

test('strip multiline error message', t => {
	const stack = [
		'error message',
		'with multiple',
		'lines',
		'',
		'Test.t (test.js:1:1)'
	].join('\n');

	t.is(extractStack(stack), 'Test.t (test.js:1:1)');
	t.end();
});

test('strip beginning whitespace from stack', t => {
	const stack = [
		'error message',
		'  Test.t (test.js:1:1)'
	].join('\n');

	t.is(extractStack(stack), 'Test.t (test.js:1:1)');
	t.end();
});
