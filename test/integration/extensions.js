'use strict';
const {test} = require('tap');
const figures = require('figures');
const {execCli} = require('../helper/cli');

for (const [where, which, msg = '\'js\', \'jsx\''] of [
	['top-level', 'top-level-duplicates'],
	['top-level and babel', 'shared-duplicates', '\'jsx\'']
]) {
	test(`errors if ${where} extensions include duplicates`, t => {
		execCli(['es2015.js'], {dirname: `fixture/invalid-extensions/${which}`}, (err, stdout, stderr) => {
			t.ok(err);

			let expectedOutput = '\n  ';
			expectedOutput += figures.cross + ` Unexpected duplicate extensions in options: ${msg}.`;
			expectedOutput += '\n';

			t.is(stderr, expectedOutput);
			t.end();
		});
	});
}
