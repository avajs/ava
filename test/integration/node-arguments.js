'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('passes node arguments to workers', t => {
	t.plan(1);
	execCli(['--node-arguments="--throw-deprecation --zero-fill-buffers"', 'node-arguments.js'], err => t.ifError(err));
});

test('reads node arguments from config', t => {
	t.plan(1);
	execCli(['test.js'], {
		dirname: 'fixture/node-arguments'
	}, err => t.ifError(err));
});
