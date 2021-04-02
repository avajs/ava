'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('observable tests fail if event loop empties before they’re resolved', t => {
	execCli('observable.js', {dirname: 'fixture/stalled-tests'}, (_, stdout) => {
		t.match(stdout, /Observable returned by test never completed/);
		t.end();
	});
});

test('promise tests fail if event loop empties before they’re resolved', t => {
	execCli('promise.js', {dirname: 'fixture/stalled-tests'}, (_, stdout) => {
		t.match(stdout, /Promise returned by test never resolved/);
		t.end();
	});
});
