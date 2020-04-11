'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('select test by line number', t => {
	execCli([
		'line-numbers.js',
		'line-numbers.js:3'
	], (error, stdout) => {
		t.ifError(error);
		t.match(stdout, /unicorn/);
		t.match(stdout, /1 test passed/);
		t.notMatch(stdout, /todo/);
		t.end();
	});
});

test('select serial test by line number', t => {
	execCli([
		'line-numbers.js:12'
	], (error, stdout) => {
		t.ifError(error);
		t.match(stdout, /cat/);
		t.match(stdout, /1 test passed/);
		t.notMatch(stdout, /todo/);
		t.end();
	});
});

test('select todo test by line number', t => {
	execCli([
		'line-numbers.js:15'
	], (error, stdout) => {
		t.ifError(error);
		t.match(stdout, /dog/);
		t.match(stdout, /1 test todo/);
		t.end();
	});
});

test('select tests by line number range', t => {
	execCli([
		'line-numbers.js:5-7'
	], (error, stdout) => {
		t.ifError(error);
		t.match(stdout, /unicorn/);
		t.match(stdout, /rainbow/);
		t.match(stdout, /2 tests passed/);
		t.notMatch(stdout, /todo/);
		t.end();
	});
});

test('no test selected by line number', t => {
	execCli([
		'line-numbers.js:6'
	], (error, stdout) => {
		t.ok(error);
		t.match(stdout, /No tests selected by line numbers/);
		t.end();
	});
});
