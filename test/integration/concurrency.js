'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('bails when --concurrency is provided without value', t => {
	execCli(['--concurrency', 'test.js'], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
		t.end();
	});
});

test('bails when --concurrency is provided with an input that is a string', t => {
	execCli(['--concurrency=foo', 'test.js'], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
		t.end();
	});
});

test('bails when --concurrency is provided with an input that is a float', t => {
	execCli(['--concurrency=4.7', 'test.js'], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
		t.end();
	});
});

test('bails when --concurrency is provided with an input that is negative', t => {
	execCli(['--concurrency=-1', 'test.js'], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
		t.end();
	});
});

test('works when --concurrency is provided with a value', t => {
	execCli(['--concurrency=1', 'test.js'], {dirname: 'fixture/concurrency'}, err => {
		t.ifError(err);
		t.end();
	});
});
