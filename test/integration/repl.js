'use strict';
const test = require('tap').test;
const execa = require('execa');

test('Throws error when required from the REPL', t => {
	return execa('node', ['-r', require.resolve('../../index.js')], {reject: false}).then(result => {
		t.match(result.stderr, 'The \'ava\' module can only be imported in test files');
	});
});
