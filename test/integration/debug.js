'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('bails when using --watch while while debugging', t => {
	execCli(['debug', '--watch', 'test.js'], {dirname: 'fixture/watcher', env: {CI: ''}}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'Watch mode is not available when debugging.');
		t.end();
	});
});

test('bails when debugging in CI', t => {
	execCli(['debug', 'test.js'], {dirname: 'fixture/watcher', env: {CI: true}}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'Debugging is not available in CI.');
		t.end();
	});
});

test('bails when --tap reporter is used while debugging', t => {
	execCli(['debug', '--tap', 'test.js'], {dirname: 'fixture/watcher', env: {CI: ''}}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The TAP reporter is not available when debugging.');
		t.end();
	});
});
