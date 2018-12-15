'use strict';
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const {test} = require('tap');
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

test('includes relative paths in source map', t => {
	execCli([], {dirname: 'fixture/correct-sources-in-source-map'}, () => {
		const [file] = globby.sync(['*.js.map'], {
			absolute: true,
			cwd: path.resolve(__dirname, '../fixture/correct-sources-in-source-map/node_modules/.cache/ava')
		});
		const map = JSON.parse(fs.readFileSync(file, 'utf8'));
		t.same(map.sources, [path.normalize('test/path-to/the/test-file.js')]);
		t.is(map.sourceRoot, path.resolve(__dirname, '../fixture/correct-sources-in-source-map'));
		t.end();
	});
});

for (const plugin of ['async-generators', 'object-rest-spread', 'optional-catch-binding']) {
	test(`avoids applying '@babel/plugin-syntax-${plugin}' if already in config`, t => {
		execCli([], {dirname: `fixture/babel/with-explicit-syntax-plugins/${plugin}`}, err => {
			t.ifError(err);
			t.end();
		});
	});
}
