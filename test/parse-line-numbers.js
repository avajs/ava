'use strict';
const {test} = require('tap');
const parseLineNumbers = require('../lib/parse-line-numbers');
const {FormatError} = parseLineNumbers;

test('single number', t => {
  t.strictDeepEqual(parseLineNumbers('2'), [2]);
  t.strictDeepEqual(parseLineNumbers('10'), [10]);
	t.end();
});

test('multiple numbers', t => {
  t.strictDeepEqual(parseLineNumbers('2,10'), [2, 10]);
	t.end();
});

test('single range', t => {
  t.strictDeepEqual(parseLineNumbers('2-4'), [2, 3, 4]);
	t.end();
});

test('multiple ranges', t => {
  t.strictDeepEqual(parseLineNumbers('2-4,8-10'), [2, 3, 4, 8, 9, 10]);
	t.end();
});

test('overlapping ranges', t => {
  t.strictDeepEqual(parseLineNumbers('2-4,3-5'), [2, 3, 4, 5]);
	t.end();
});


test('mix of number and range', t => {
  t.strictDeepEqual(parseLineNumbers('2,8-10'), [2, 8, 9, 10]);
	t.end();
});

test('overlap between number and range', t => {
  t.strictDeepEqual(parseLineNumbers('3,2-4'), [2, 3, 4]);
	t.end();
});

test('trim any whitespace', t => {
  t.strictDeepEqual(parseLineNumbers(' 2 , 3 - 4 '), [2, 3, 4]);
	t.end();
});

test('non-positive number -> throws', t => {
  t.throws(() => parseLineNumbers('0'), {message: 'Invalid line number: `0`. Line numbers must be positive.'});
  t.throws(() => parseLineNumbers('-2'), {message: 'Invalid line number: `-2`. Line numbers must be positive.'});
	t.end();
});

test('reverse order range -> throws', t => {
  t.throws(() => parseLineNumbers('3-1'), {message: 'Invalid line number range: `3-1`. `start` must be lesser than `end`.'});
	t.end();
});

test('invalid input -> throws', t => {
  t.throws(() => parseLineNumbers(), {message: 'Invalid line number: `undefined`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers(null), {message: 'Invalid line number: `null`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers(' '), {message: 'Invalid line number: ` `. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers('a'), {message: 'Invalid line number: `a`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers('a-b'), {message: 'Invalid line numbers: `a-b`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers('1..3'), {message: 'Invalid line numbers: `1..3`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers('1-2 3-4'), {message: 'Invalid line numbers: `1-2 3-4`. Expected comma-separated list of `[X|Y-Z]`.'});
  t.throws(() => parseLineNumbers('1-2:3-4'), {message: 'Invalid line numbers: `1-2:3-4`. Expected comma-separated list of `[X|Y-Z]`.'});
	t.end();
});