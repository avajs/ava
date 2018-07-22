'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

test('improper use of t.throws will be reported to the console', t => {
	execCli('throws.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', t => {
	execCli('promise.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a pending promise, even if caught and rethrown immediately, will be reported to the console', t => {
	execCli('leaked-from-promise.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within an async callback will be reported to the console', t => {
	execCli('async-callback.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, swallowed as an unhandled rejection, will be reported to the console', t => {
	execCli('unhandled-rejection.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught, will be reported to the console', t => {
	execCli('caught.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown immediately, will be reported to the console', t => {
	execCli('caught-and-leaked.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then later rethrown, will be reported to the console', t => {
	execCli('caught-and-leaked-slowly.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown too slowly, will be reported to the console', t => {
	execCli('caught-and-leaked-too-slowly.js', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});
