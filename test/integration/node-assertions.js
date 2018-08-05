'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

// The AssertionError constructor in Node 10 depends on the TTY interface
test('node assertion failures are reported to the console when running in a terminal', t => {
	const options = {
		dirname: 'fixture/node-assertions',
		env: {
			AVA_SIMULATE_TTY: true,
			AVA_TTY_COLOR_DEPTH: 8
		}
	};

	execCli('assert-failure.js', options, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /AssertionError/);
		t.end();
	});
});

test('node assertion failures are reported to the console when not running in a terminal', t => {
	execCli('assert-failure.js', {dirname: 'fixture/node-assertions'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /AssertionError/);
		t.end();
	});
});
