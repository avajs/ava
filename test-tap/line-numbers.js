'use strict';

const path = require('path');
const escapeStringRegExp = require('escape-string-regexp');
const {test} = require('tap');
const {
	splitPatternAndLineNumbers,
	getLineNumberRangeForTestInFile,
	isTestSelectedByLineNumbers
} = require('../lib/line-numbers');

const testFilePath = path.join(__dirname, 'fixture', 'line-numbers.js');
// Escaping needed for Windows
const escapedTestFilePath = escapeStringRegExp(testFilePath);

test('no line numbers', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js'), {pattern: 'test.js', lineNumbers: null});
	t.end();
});

test('delimeter but no line numbers suffix', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:foo'), {pattern: 'test.js:foo', lineNumbers: null});
	t.strictDeepEqual(splitPatternAndLineNumbers('test:3.js'), {pattern: 'test:3.js', lineNumbers: null});
	t.end();
});

test('single line number', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2'), {pattern: 'test.js', lineNumbers: [2]});
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:10'), {pattern: 'test.js', lineNumbers: [10]});
	t.end();
});

test('multiple line numbers', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2,10'), {pattern: 'test.js', lineNumbers: [2, 10]});
	t.end();
});

test('single range', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2-4'), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('multiple ranges', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2-4,8-10'), {pattern: 'test.js', lineNumbers: [2, 3, 4, 8, 9, 10]});
	t.end();
});

test('overlapping ranges', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2-4,3-5'), {pattern: 'test.js', lineNumbers: [2, 3, 4, 5]});
	t.end();
});

test('mix of number and range', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:2,8-10'), {pattern: 'test.js', lineNumbers: [2, 8, 9, 10]});
	t.end();
});

test('overlapping number and range', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js:3,2-4'), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('handle whitespace', t => {
	t.strictDeepEqual(splitPatternAndLineNumbers('test.js: 2 , 3 - 4 '), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('non-positive numbers -> throws', t => {
	t.throws(() => splitPatternAndLineNumbers('test.js:0'), {
		message: 'Invalid line number: `0`. Line numbers must be positive.'
	});
	t.throws(() => splitPatternAndLineNumbers('test.js:-2'), {
		message: 'Invalid line number: `-2`. Line numbers must be positive.'
	});
	t.throws(() => splitPatternAndLineNumbers('test.js:-2--1'), {
		message: 'Invalid line number range: `-2--1`. Line numbers must be positive.'
	});
	t.end();
});

test('reversed order range -> throws', t => {
	t.throws(() => splitPatternAndLineNumbers('test.js:3-1'), {
		message: 'Invalid line number range: `3-1`. `start` must be less than `end`.'
	});
	t.end();
});

test('line number range for test never being declared -> throws', t => {
	t.throws(() => getLineNumberRangeForTestInFile('unicorn', testFilePath),
		new RegExp(`Failed to resolve line number range for test \`unicorn\` in ${escapedTestFilePath}.`)
	);
	t.end();
});

test('test is selected by line numbers', t => {
	t.true(isTestSelectedByLineNumbers({startLineNumber: 3, endLineNumber: 5}, [4]));
	t.end();
});

test('test is not selected by line numbers', t => {
	t.false(isTestSelectedByLineNumbers({startLineNumber: 7, endLineNumber: 9}, [6]));
	t.end();
});
