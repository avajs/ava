'use strict';

const {test} = require('tap');
const normalizeNodeArguments = require('../lib/node-arguments');

test('normalizes multiple node arguments from cli', t => {
	t.deepEqual(normalizeNodeArguments([], '--a --b --c'), {a: true, b: true, c: true});
	t.end();
});

test('normalizes multiple node arguments from config', t => {
	t.deepEqual(normalizeNodeArguments(['--arg1', '--b'], ''), {arg1: true, b: true});
	t.end();
});

test('normalizes node arguments from config and cli', t => {
	t.deepEqual(
		normalizeNodeArguments(['--arg1', '--b=2'], '--arg2 --b=12'),
		{arg1: true, arg2: true, b: 12}
	);
	t.end();
});

test('normalizes single node arguments from cli', t => {
	t.deepEqual(normalizeNodeArguments([], '--test-flag'), {'test-flag': true});
	t.end();
});
