'use strict';
const test = require('tap').test;
const figures = require('figures');
const pkg = require('../../package.json');
const {execCli} = require('../helper/cli');

for (const which of [
	'bad-key',
	'bad-shortcut',
	'array-test-options',
	'false-test-options',
	'null-test-options',
	'null-extensions',
	'obj-extensions',
	'string-extensions',
	'non-string-value-extensions',
	'empty-string-value-extensions'
]) {
	test(`validates babel config: ${which}`, t => {
		execCli(['es2015.js'], {dirname: `fixture/invalid-babel-config/${which}`}, (err, stdout, stderr) => {
			t.ok(err);

			let expectedOutput = '\n';
			expectedOutput += figures.cross + ' Unexpected Babel configuration for AVA.';
			expectedOutput += ` See https://github.com/avajs/ava/blob/v${pkg.version}/docs/recipes/babel.md for allowed values.`;
			expectedOutput += '\n';

			t.is(stderr, expectedOutput);
			t.end();
		});
	});
}
