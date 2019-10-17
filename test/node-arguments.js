'use strict';

const {test} = require('tap');
const normalizeNodeArguments = require('../lib/node-arguments');

test('normalizes multiple node arguments from cli', t => {
	t.deepEqual(normalizeNodeArguments('"--a --b --c"'), ['--a', '--b', '--c']);
	t.end();
});

test('normalizes multiple node arguments from config', t => {
	t.deepEqual(normalizeNodeArguments(['--arg1', '--b']), ['--arg1', '--b']);
	t.end();
});

test('normalizes single node arguments from cli', t => {
	t.deepEqual(normalizeNodeArguments('--test-flag'), ['--test-flag']);
	t.end();
});

test('removes extra inspect', t => {
	process.execArgv = ['--inspect-brk=123'];
	t.deepEqual(normalizeNodeArguments('--inspect'), ['--inspect']);
	t.end();
});

test('fails on inspect with port', t => {
	t.throws(() => normalizeNodeArguments('--inspect=9230'), 'The \'nodeArguments\' configuration must not contain inspect with port.');
	t.end();
});

