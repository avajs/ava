'use strict';
const path = require('path');
const {test} = require('tap');
const touch = require('touch');
const {execCli} = require('../helper/cli');

const END_MESSAGE = 'Type `r` and press enter to rerun tests\nType `u` and press enter to update snapshots\n';

test('watcher reruns test files upon change', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', 'test.js'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'not-ci'}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', string => {
		buffer += string;
		if (buffer.includes('1 test passed')) {
			if (!passedFirst) {
				touch.sync(path.join(__dirname, '../fixture/watcher/test.js'));
				buffer = '';
				passedFirst = true;
			} else if (!killed) {
				child.kill();
				killed = true;
			}
		}
	});
});

test('watcher reruns test files when source dependencies change', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', 'test-1.js', 'test-2.js'], {dirname: 'fixture/watcher/with-dependencies', env: {AVA_FORCE_CI: 'not-ci'}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', string => {
		buffer += string;
		if (buffer.includes('2 tests passed') && !passedFirst) {
			touch.sync(path.join(__dirname, '../fixture/watcher/with-dependencies/source.js'));
			buffer = '';
			passedFirst = true;
		} else if (buffer.includes('1 test passed') && !killed) {
			child.kill();
			killed = true;
		}
	});
});

test('watcher does not rerun test files when they write snapshot files', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots/watcher-rerun', env: {AVA_FORCE_CI: 'not-ci'}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', string => {
		buffer += string;
		if (buffer.includes('2 tests passed') && !passedFirst) {
			buffer = '';
			passedFirst = true;
			setTimeout(() => {
				child.kill();
				killed = true;
			}, 500);
		} else if (passedFirst && !killed) {
			t.is(buffer.replace(/\s/g, '').replace(END_MESSAGE.replace(/\s/g, ''), ''), '');
		}
	});
});

test('watcher does not rerun test files when they unlink snapshot files', t => {
	// Run fixture as template to generate snapshots
	execCli(
		['--update-snapshots'],
		{
			dirname: 'fixture/snapshots/watcher-rerun-unlink',
			env: {AVA_FORCE_CI: 'not-ci', TEMPLATE: 'true'}
		},
		err => {
			t.ifError(err);

			// Run fixture in watch mode; snapshots should be removed, and watcher should not rerun
			let killed = false;

			const child = execCli(
				['--verbose', '--watch', '--update-snapshots', 'test.js'],
				{
					dirname: 'fixture/snapshots/watcher-rerun-unlink',
					env: {AVA_FORCE_CI: 'not-ci'}
				},
				err => {
					t.ok(killed);
					t.ifError(err);
					t.end();
				}
			);

			let buffer = '';
			let passedFirst = false;
			child.stdout.on('data', string => {
				buffer += string;
				if (buffer.includes('2 tests passed') && !passedFirst) {
					buffer = '';
					passedFirst = true;
					setTimeout(() => {
						child.kill();
						killed = true;
					}, 500);
				} else if (passedFirst && !killed) {
					t.is(buffer.replace(/\s/g, '').replace(END_MESSAGE.replace(/\s/g, ''), ''), '');
				}
			});
		}
	);
});

test('watcher does not rerun test files when ignored files change', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch'], {dirname: 'fixture/watcher/ignored-files', env: {AVA_FORCE_CI: 'not-ci'}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', string => {
		buffer += string;
		if (buffer.includes('1 test passed') && !passedFirst) {
			touch.sync(path.join(__dirname, '../fixture/watcher/ignored-files/ignored.js'));
			buffer = '';
			passedFirst = true;
			setTimeout(() => {
				child.kill();
				killed = true;
			}, 500);
		} else if (passedFirst && !killed) {
			t.is(buffer.replace(/\s/g, '').replace(END_MESSAGE.replace(/\s/g, ''), ''), '');
		}
	});
});

test('watcher reruns test files when snapshot dependencies change', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots/watcher-rerun', env: {AVA_FORCE_CI: 'not-ci'}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', string => {
		buffer += string;
		if (buffer.includes('2 tests passed')) {
			buffer = '';
			if (passedFirst) {
				child.kill();
				killed = true;
			} else {
				passedFirst = true;
				setTimeout(() => {
					touch.sync(path.join(__dirname, '../fixture/snapshots/watcher-rerun/test.js.snap'));
				}, 500);
			}
		}
	});
});

test('`"tap": true` config is ignored when --watch is given', t => {
	let killed = false;

	const child = execCli(['--watch', '--verbose', 'test.js'], {dirname: 'fixture/watcher/tap-in-conf', env: {AVA_FORCE_CI: 'not-ci'}}, () => {
		t.ok(killed);
		t.end();
	});

	let combined = '';
	const testOutput = output => {
		combined += output;
		t.notMatch(combined, /TAP/);
		if (combined.includes('works')) {
			child.kill();
			killed = true;
		}
	};

	child.stdout.on('data', testOutput);
	child.stderr.on('data', testOutput);
});

test('bails when --tap reporter is used while --watch is given', t => {
	execCli(['--tap', '--watch', 'test.js'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'not-ci'}}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The TAP reporter is not available when using watch mode.');
		t.end();
	});
});

test('bails when CI is used while --watch is given', t => {
	execCli(['--watch', 'test.js'], {dirname: 'fixture/watcher', env: {AVA_FORCE_CI: 'ci'}}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'Watch mode is not available in CI, as it prevents AVA from terminating.');
		t.end();
	});
});
