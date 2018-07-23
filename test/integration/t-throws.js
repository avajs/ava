'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

test('improper use of t.throws will be reported to the console', t => {
	execCli('fixture/improper-t-throws/throws.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', t => {
	execCli('fixture/improper-t-throws/promise.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a pending promise, even if caught and rethrown immediately, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/leaked-from-promise.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within an async callback will be reported to the console', t => {
	execCli('fixture/improper-t-throws/async-callback.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, swallowed as an unhandled rejection, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/unhandled-rejection.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown immediately, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then later rethrown, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked-slowly.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown too slowly, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked-too-slowly.js', (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});
