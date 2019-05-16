'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');
const {expectedName, name, value} = require('../fixture/environment-variables');

test('sets default environment variables from the config', t => {
	execCli(['test.js'], {dirname: 'fixture/environment-variables'}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('skips already set environment variables', t => {
	const env = {[name]: value, [expectedName]: value};

	execCli(['test.js'], {dirname: 'fixture/environment-variables', env}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});
