'use strict';
const {test} = require('tap');
const figures = require('figures');
const {execCli} = require('../helper/cli');

test('errors if top-level files is an empty array', t => {
	execCli(['es2015.js'], {dirname: 'fixture/invalid-globs/files'}, (err, stdout, stderr) => {
		t.ok(err);

		let expectedOutput = '\n';
		expectedOutput += figures.cross + ' The \'files\' configuration must be an array containing glob patterns.';
		expectedOutput += '\n';

		t.is(stderr, expectedOutput);
		t.end();
	});
});

test('errors if top-level sources is an empty array', t => {
	execCli(['es2015.js'], {dirname: 'fixture/invalid-globs/sources'}, (err, stdout, stderr) => {
		t.ok(err);

		let expectedOutput = '\n';
		expectedOutput += figures.cross + ' The \'sources\' configuration must be an array containing glob patterns.';
		expectedOutput += '\n';

		t.is(stderr, expectedOutput);
		t.end();
	});
});
