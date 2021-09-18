import {test} from 'tap';

import {splitPatternAndLineNumbers, getApplicableLineNumbers} from '../lib/line-numbers.js';

test('no line numbers', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js'), {pattern: 'test.js', lineNumbers: null});
	t.end();
});

test('delimeter but no line numbers suffix', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:foo'), {pattern: 'test.js:foo', lineNumbers: null});
	t.strictSame(splitPatternAndLineNumbers('test:3.js'), {pattern: 'test:3.js', lineNumbers: null});
	t.end();
});

test('single line number', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2'), {pattern: 'test.js', lineNumbers: [2]});
	t.strictSame(splitPatternAndLineNumbers('test.js:10'), {pattern: 'test.js', lineNumbers: [10]});
	t.end();
});

test('multiple line numbers', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2,10'), {pattern: 'test.js', lineNumbers: [2, 10]});
	t.end();
});

test('single range', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2-4'), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('multiple ranges', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2-4,8-10'), {pattern: 'test.js', lineNumbers: [2, 3, 4, 8, 9, 10]});
	t.end();
});

test('overlapping ranges', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2-4,3-5'), {pattern: 'test.js', lineNumbers: [2, 3, 4, 5]});
	t.end();
});

test('mix of number and range', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:2,8-10'), {pattern: 'test.js', lineNumbers: [2, 8, 9, 10]});
	t.end();
});

test('overlapping number and range', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js:3,2-4'), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('handle whitespace', t => {
	t.strictSame(splitPatternAndLineNumbers('test.js: 2 , 3 - 4 '), {pattern: 'test.js', lineNumbers: [2, 3, 4]});
	t.end();
});

test('ignore non-matching patterns', t => {
	t.strictSame(
		getApplicableLineNumbers('test.js', [{pattern: 'test.js', lineNumbers: [2]}, {pattern: 'foo.js', lineNumbers: [3]}]),
		[2],
	);
	t.end();
});

test('deduplicate line numbers', t => {
	t.strictSame(
		getApplicableLineNumbers('test.js', [{pattern: 'test.js', lineNumbers: [2, 3, 4]}, {pattern: 'test.js', lineNumbers: [3, 4, 5]}]),
		[2, 3, 4, 5],
	);
	t.end();
});

test('sort line numbers', t => {
	t.strictSame(
		getApplicableLineNumbers('test.js', [{pattern: 'test.js', lineNumbers: [1, 3, 5]}, {pattern: 'test.js', lineNumbers: [2, 4, 6]}]),
		[1, 2, 3, 4, 5, 6],
	);
	t.end();
});
