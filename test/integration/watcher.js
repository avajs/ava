'use strict';
const path = require('path');
const {test} = require('tap');
const touch = require('touch');
const {execCli} = require('../helper/cli');

const END_MESSAGE = 'Type `r` and press enter to rerun tests\nType `u` and press enter to update snapshots\n';

test('watcher reruns test files when they changed', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', 'test.js'], {dirname: 'fixture/watcher', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
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

test('watcher respects custom test file extensions', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch'], {dirname: 'fixture/watcher/custom-extensions', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
		if (buffer.includes('1 test passed')) {
			if (!passedFirst) {
				touch.sync(path.join(__dirname, '../fixture/watcher/custom-extensions/test.foo'));
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

	const child = execCli(['--verbose', '--watch', 'test-1.js', 'test-2.js'], {dirname: 'fixture/watcher/with-dependencies', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
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

test('watcher reruns ONLY test files that depend on a changed source with custom extension', t => {
	let killed = false;

	const child = execCli(['--verbose', '--require', './setup.js', '--watch', 'test-1.js', 'test-2.js'], {dirname: 'fixture/watcher/with-custom-ext-dependencies', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
		if (buffer.includes('2 tests passed') && !passedFirst) {
			touch.sync(path.join(__dirname, '../fixture/watcher/with-custom-ext-dependencies/source.custom-ext'));
			buffer = '';
			passedFirst = true;
		} else if (buffer.includes('1 test passed') && !killed) {
			child.kill();
			killed = true;
		}
	});
});

test('watcher reruns all tests when one of the configured files in the `require` option changes', t => {
	let killed = false;

	const child = execCli(['--verbose', '--require', './setup.js', '--watch', 'test-1.js', 'test-2.js'], {dirname: 'fixture/watcher/with-custom-ext-dependencies', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
		if (buffer.includes('2 tests passed') && !passedFirst) {
			touch.sync(path.join(__dirname, '../fixture/watcher/with-custom-ext-dependencies/setup.js'));
			buffer = '';
			passedFirst = true;
		} else if (buffer.includes('2 tests passed') && !killed) {
			child.kill();
			killed = true;
		}
	});
});

test('watcher reruns only test cases declared with `.only`', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', 'test-only.js'], {dirname: 'fixture/watcher/with-only', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
		if (buffer.includes('1 test passed') && !passedFirst) {
			touch.sync(path.join(__dirname, '../fixture/watcher/with-only/test-only.js'));
			buffer = '';
			passedFirst = true;
		} else if (buffer.includes('1 test passed') && !killed) {
			child.kill();
			killed = true;
		} else if (buffer.includes('tests passed') && !killed) {
			t.fail('Expected a single test declared with `.only` to run');
			child.kill();
			killed = true;
		}
	});
});

test('watcher does not rerun test files when they write snapshot files', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
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

test('watcher does not rerun test files when files change that are neither tests, helpers nor sources', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch'], {dirname: 'fixture/watcher/ignored-files', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
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

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots', env: {CI: ''}}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stdout.on('data', str => {
		buffer += str;
		if (buffer.includes('2 tests passed')) {
			buffer = '';
			if (passedFirst) {
				child.kill();
				killed = true;
			} else {
				passedFirst = true;
				setTimeout(() => {
					touch.sync(path.join(__dirname, '../fixture/snapshots/test.js.snap'));
				}, 500);
			}
		}
	});
});

test('`"tap": true` config is ignored when --watch is given', t => {
	let killed = false;

	const child = execCli(['--watch', '--verbose', 'test.js'], {dirname: 'fixture/watcher/tap-in-conf', env: {CI: ''}}, () => {
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

for (const watchFlag of ['--watch', '-w']) {
	for (const tapFlag of ['--tap', '-t']) {
		test(`bails when ${tapFlag} reporter is used while ${watchFlag} is given`, t => {
			execCli([tapFlag, watchFlag, 'test.js'], {dirname: 'fixture/watcher', env: {CI: ''}}, (err, stdout, stderr) => {
				t.is(err.code, 1);
				t.match(stderr, 'The TAP reporter is not available when using watch mode.');
				t.end();
			});
		});
	}
}

for (const watchFlag of ['--watch', '-w']) {
	test(`bails when CI is used while ${watchFlag} is given`, t => {
		execCli([watchFlag, 'test.js'], {dirname: 'fixture/watcher', env: {CI: true}}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'Watch mode is not available in CI, as it prevents AVA from terminating.');
			t.end();
		});
	});
}
