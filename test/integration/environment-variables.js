'use strict';
const {test} = require('tap');
const figures = require('figures');
const {execCli} = require('../helper/cli');

test('sets default environment variables from the config', t => {
	execCli(['test.js'], {dirname: 'fixture/environment-variables'}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('overrides environment variables provided through the CLI', t => {
	const env = {MY_ENVIRONMENT_VARIABLE: 'some value (updated)'};

	execCli(['test.js'], {dirname: 'fixture/environment-variables', env}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('errors if environment variables are not string values', t => {
	execCli(['es2015.js'], {dirname: 'fixture/invalid-environment-variables'}, (err, stdout, stderr) => {
		t.ok(err);

		let expectedOutput = '\n  ';
		expectedOutput += figures.cross + ' The \'environmentVariables\' configuration must be an object containing string values.';
		expectedOutput += '\n';

		t.is(stderr, expectedOutput);
		t.end();
	});
});
