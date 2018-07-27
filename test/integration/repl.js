'use strict';
const test = require('tap').test;
const execa = require('execa');

test('Throws error when required from the REPL', t => {
	execa.shell(`node -r '${require.resolve('../../index.js')}'`, {reject: false})
		.then(result => {
			t.match(result.stderr, /Tests must be run from test files with the AVA CLI/);
			t.end();
		})
		.catch(t.threw);
});
