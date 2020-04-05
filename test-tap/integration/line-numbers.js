'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('can select tests by line numbers', t => {
	execCli([
		'line-numbers.js',
		'line-numbers.js:8',
		'line-numbers.js:7-15',
		'one-pass-one-fail.js:5'
	], (error, stdout) => {
		t.ifError(error);
		t.match(stdout, /3 tests passed\s+1 test todo/);
		t.end();
	});
});
