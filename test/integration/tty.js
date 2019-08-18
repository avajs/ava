'use strict';
const {test} = require('tap');
const {execCli} = require('../helper/cli');

test('test workers do not get TTYs when ava is not run with TTYs', t => {
	execCli('is-not-tty.js', {dirname: 'fixture/tty'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('test workers get TTYs when ava is run with TTYs', t => {
	const options = {
		dirname: 'fixture/tty',
		env: {AVA_SIMULATE_TTY: true}
	};

	execCli('is-tty.js', options, err => {
		t.ifError(err);
		t.end();
	});
});

test('test worker TTYs do not support getColorDepth by default', t => {
	const options = {
		dirname: 'fixture/tty',
		env: {AVA_SIMULATE_TTY: true}
	};

	execCli('get-color-depth-missing.js', options, err => {
		t.ifError(err);
		t.end();
	});
});

test('test worker TTYs do not support color if the parent TTYs do not', t => {
	const options = {
		dirname: 'fixture/tty',
		env: {
			AVA_SIMULATE_TTY: true,
			AVA_TTY_COLOR_DEPTH: 1
		}
	};

	execCli('color-disabled.js', options, err => {
		t.ifError(err);
		t.end();
	});
});

test('test worker TTYs inherit color support from the parent TTY', t => {
	const options = {
		dirname: 'fixture/tty',
		env: {
			AVA_SIMULATE_TTY: true,
			AVA_TTY_COLOR_DEPTH: 8
		}
	};

	execCli('color-enabled.js', options, err => {
		t.ifError(err);
		t.end();
	});
});

test('test worker TTYs take / do not take callbacks', t => {
	const options = {
		dirname: 'fixture/tty',
		env: {
			AVA_SIMULATE_TTY: true
		}
	};

	execCli('callbacks.js', options, err => {
		t.ifError(err);
		t.end();
	});
});
