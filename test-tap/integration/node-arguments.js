'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('passes node arguments to workers', t => {
	t.plan(1);
	execCli(['--node-arguments="--throw-deprecation --zero-fill-buffers"', 'node-arguments.js'],
		(err, stdout, stderr) => t.ifError(err, null, {stdout, stderr}));
});

test('passes node arguments pass by ava env var to workers', t => {
	t.plan(1);
	execCli(['node-arguments.js'], {
		env: {AVA_NODE_ARGUMENTS: '--throw-deprecation --zero-fill-buffers'}
	}, (err, stdout, stderr) => t.ifError(err, null, {stdout, stderr}));
});

test('passes node arguments pass via env and cli to workers', t => {
	t.plan(1);
	execCli(['--node-arguments=--throw-deprecation', 'node-arguments.js'], {
		env: {AVA_NODE_ARGUMENTS: '--zero-fill-buffers'}
	}, (err, stdout, stderr) => t.ifError(err, null, {stdout, stderr}));
});

test('reads node arguments from config', t => {
	t.plan(1);
	execCli(['test.js'], {
		dirname: 'fixture/node-arguments'
	}, (err, stdout, stderr) => t.ifError(err, null, {stdout, stderr}));
});

test('detects incomplete --node-arguments', t => {
	t.plan(2);
	execCli(['--node-arguments="--foo=\'bar"', 'node-arguments.js'], (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Could not parse `--node-arguments` value. Make sure all strings are closed and backslashes are used correctly./);
	});
});
