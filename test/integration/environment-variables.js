'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');
const {name, value} = require('../fixture/environment-variables');

test('sets default environment variables from the config', t => {
	execCli(['test.js'], {dirname: 'fixture/environment-variables'}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('overrides environment variables provided through the CLI', t => {
	const env = {[name]: `${value} (updated)`};

	execCli(['test.js'], {dirname: 'fixture/environment-variables', env}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});
