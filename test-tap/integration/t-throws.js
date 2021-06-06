import {test} from 'tap';

import {execCli} from '../helper/cli.js';

test('improper use of t.throws will be reported to the console', t => {
	execCli('throws.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', t => {
	execCli('promise.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a pending promise, even if caught and rethrown immediately, will be reported to the console', t => {
	execCli('leaked-from-promise.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, swallowed as an unhandled rejection, will be reported to the console', t => {
	execCli('unhandled-rejection.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught, will be reported to the console', t => {
	execCli('caught.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown immediately, will be reported to the console', t => {
	execCli('caught-and-leaked.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then later rethrown, will be reported to the console', t => {
	execCli('caught-and-leaked-slowly.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown too slowly, will be reported to the console', t => {
	execCli('caught-and-leaked-too-slowly.cjs', {dirname: 'fixture/improper-t-throws'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stdout, /should be detected/);
		t.match(stdout, /Try wrapping the first argument/);
		t.end();
	});
});
