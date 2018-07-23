'use strict';
const stripAnsi = require('strip-ansi');
const test = require('tap').test;
const {execCli} = require('../helper/cli');

test('precompiler require hook does not apply to source files', t => {
	t.plan(3);

	execCli('babel-hook.js', (err, stdout) => {
		t.ok(err);
		t.is(err.code, 1);
		t.match(stdout, /Unexpected (token|reserved word)/);
		t.end();
	});
});

test('skips test file compilation when babel=false and compileEnhancements=false', t => {
	execCli(['import.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /SyntaxError: Unexpected (reserved word|token import|identifier)/);
		t.end();
	});
});

test('skips helper file compilation when babel=false and compileEnhancements=false', t => {
	execCli(['require-helper.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout) => {
		t.ifError(err);
		t.match(stdout, /1 test passed/);
		t.end();
	});
});

test('no power-assert when babel=false and compileEnhancements=false', t => {
	execCli(['no-power-assert.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout) => {
		t.ok(err);
		t.notMatch(stripAnsi(stdout), /bool\n.*=> false/);
		t.end();
	});
});

test('skips stage-4 transform when babel=false and compileEnhancements=true', t => {
	execCli(['import.js'], {dirname: 'fixture/just-enhancement-compilation'}, (err, stdout) => {
		t.ok(err);
		t.match(stdout, /SyntaxError: Unexpected (reserved word|token import|identifier)/);
		t.end();
	});
});

test('power-assert when babel=false and compileEnhancements=true', t => {
	execCli(['power-assert.js'], {dirname: 'fixture/just-enhancement-compilation'}, (err, stdout) => {
		t.ok(err);
		t.match(stripAnsi(stdout), /bool\n.*=> false/);
		t.end();
	});
});

test('power-assert with custom extension and no regular babel pipeline', t => {
	execCli(['.'], {dirname: 'fixture/just-enhancement-compilation/custom-extension'}, (err, stdout) => {
		t.ok(err);
		t.match(stripAnsi(stdout), /bool\n.*=> false/);
		t.end();
	});
});

test('workers load compiled helpers if in the require configuration', t => {
	execCli(['test/verify.js'], {dirname: 'fixture/require-compiled-helper'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('skips babel compilation for custom extensions, with disabled enhancement compilation', t => {
	execCli(['test.ts'], {dirname: 'fixture/ts-node'}, err => {
		t.ifError(err);
		t.end();
	});
});
