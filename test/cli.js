'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const test = require('tap').test;
const getStream = require('get-stream');
const figures = require('figures');
const makeDir = require('make-dir');
const touch = require('touch');
const uniqueTempDir = require('unique-temp-dir');
const execa = require('execa');
const stripAnsi = require('strip-ansi');

const cliPath = path.join(__dirname, '../cli.js');

function execCli(args, opts, cb) {
	let dirname;
	let env;

	if (typeof opts === 'function') {
		cb = opts;
		dirname = __dirname;
		env = {};
	} else {
		dirname = path.join(__dirname, opts.dirname ? opts.dirname : '');
		env = opts.env || {};
	}

	let child;
	let stdout;
	let stderr;

	const processPromise = new Promise(resolve => {
		child = childProcess.spawn(process.execPath, [cliPath].concat(args), {
			cwd: dirname,
			env,
			stdio: [null, 'pipe', 'pipe']
		});

		child.on('close', (code, signal) => {
			if (code) {
				const err = new Error(`test-worker exited with a non-zero exit code: ${code}`);
				err.code = code;
				err.signal = signal;
				resolve(err);
				return;
			}

			resolve(code);
		});

		stdout = getStream(child.stdout);
		stderr = getStream(child.stderr);
	});

	Promise.all([processPromise, stdout, stderr]).then(args => {
		cb.apply(null, args);
	});

	return child;
}

test('disallow invalid babel config shortcuts', t => {
	execCli(['es2015.js'], {dirname: 'fixture/invalid-babel-config'}, (err, stdout, stderr) => {
		t.ok(err);

		let expectedOutput = '\n  ';
		expectedOutput += figures.cross + ' Unexpected Babel configuration for AVA.';
		expectedOutput += ' See https://github.com/avajs/ava#es2017-support for allowed values.';
		expectedOutput += '\n';

		t.is(stderr, expectedOutput);
		t.end();
	});
});

test('timeout', t => {
	execCli(['fixture/long-running.js', '-T', '1s'], (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Exited because no new tests completed within the last 1000ms of inactivity/);
		t.end();
	});
});

test('throwing a named function will report the to the console', t => {
	execCli('fixture/throw-named-function.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /function fooFn\(\) \{\}/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('improper use of t.throws will be reported to the console', t => {
	execCli('fixture/improper-t-throws/throws.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', t => {
	execCli('fixture/improper-t-throws/promise.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within a pending promise, even if caught and rethrown immediately, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/leaked-from-promise.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws from within an async callback will be reported to the console', t => {
	execCli('fixture/improper-t-throws/async-callback.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, swallowed as an unhandled rejection, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/unhandled-rejection.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown immediately, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then later rethrown, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked-slowly.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.match(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('improper use of t.throws, even if caught and then rethrown too slowly, will be reported to the console', t => {
	execCli('fixture/improper-t-throws/caught-and-leaked-too-slowly.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of `t\.throws\(\)` detected/);
		t.notMatch(stderr, /should be detected/);
		t.match(stderr, /Try wrapping the first argument/);
		t.end();
	});
});

test('babel require hook only does not apply to source files', t => {
	t.plan(3);

	execCli('fixture/babel-hook.js', (err, stdout, stderr) => {
		t.ok(err);
		t.is(err.code, 1);
		t.match(stderr, /Unexpected (token|reserved word)/);
		t.end();
	});
});

test('throwing a anonymous function will report the function to the console', t => {
	execCli('fixture/throw-anonymous-function.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /\(\) => \{\}/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('pkg-conf: defaults', t => {
	execCli([], {dirname: 'fixture/pkg-conf/defaults'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: pkg-overrides', t => {
	execCli([], {dirname: 'fixture/pkg-conf/pkg-overrides'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: cli takes precedence', t => {
	execCli(['--match=foo*', '--no-serial', '--cache', '--no-fail-fast', 'c.js'], {dirname: 'fixture/pkg-conf/precedence'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf(resolve-dir): works as expected when run from the package.json directory', t => {
	execCli(['--verbose'], {dirname: 'fixture/pkg-conf/resolve-dir'}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /dir-a-base-1/);
		t.match(stderr, /dir-a-base-2/);
		t.notMatch(stderr, /dir-a-wrapper/);
		t.notMatch(stdout, /dir-a-wrapper/);
		t.end();
	});
});

test('pkg-conf(resolve-dir): resolves tests from the package.json dir if none are specified on cli', t => {
	execCli(['--verbose'], {dirname: 'fixture/pkg-conf/resolve-dir/dir-a-wrapper'}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /dir-a-base-1/);
		t.match(stderr, /dir-a-base-2/);
		t.notMatch(stderr, /dir-a-wrapper/);
		t.notMatch(stdout, /dir-a-wrapper/);
		t.end();
	});
});

test('pkg-conf(resolve-dir): resolves tests process.cwd() if globs are passed on the command line', t => {
	execCli(['--verbose', 'dir-a/*.js'], {dirname: 'fixture/pkg-conf/resolve-dir/dir-a-wrapper'}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /dir-a-wrapper-3/);
		t.match(stderr, /dir-a-wrapper-4/);
		t.notMatch(stderr, /dir-a-base/);
		t.notMatch(stdout, /dir-a-base/);
		t.end();
	});
});

test('watcher reruns test files when they changed', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', 'test.js'], {dirname: 'fixture/watcher'}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stderr.on('data', str => {
		buffer += str;
		if (/1 test passed/.test(buffer)) {
			if (!passedFirst) {
				touch.sync(path.join(__dirname, 'fixture/watcher/test.js'));
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

	const child = execCli(['--verbose', '--watch', 'test-*.js'], {dirname: 'fixture/watcher/with-dependencies'}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stderr.on('data', str => {
		buffer += str;
		if (/2 tests passed/.test(buffer) && !passedFirst) {
			touch.sync(path.join(__dirname, 'fixture/watcher/with-dependencies/source.js'));
			buffer = '';
			passedFirst = true;
		} else if (/1 test passed/.test(buffer) && !killed) {
			child.kill();
			killed = true;
		}
	});
});

test('watcher does not rerun test files when they write snapshot files', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots'}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stderr.on('data', str => {
		buffer += str;
		if (/2 tests passed/.test(buffer) && !passedFirst) {
			buffer = '';
			passedFirst = true;
			setTimeout(() => {
				child.kill();
				killed = true;
			}, 500);
		} else if (passedFirst && !killed) {
			t.is(buffer.replace(/\s/g, ''), '');
		}
	});
});

test('watcher reruns test files when snapshot dependencies change', t => {
	let killed = false;

	const child = execCli(['--verbose', '--watch', '--update-snapshots', 'test.js'], {dirname: 'fixture/snapshots'}, err => {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	let buffer = '';
	let passedFirst = false;
	child.stderr.on('data', str => {
		buffer += str;
		if (/2 tests passed/.test(buffer)) {
			buffer = '';
			if (passedFirst) {
				child.kill();
				killed = true;
			} else {
				passedFirst = true;
				setTimeout(() => {
					touch.sync(path.join(__dirname, 'fixture/snapshots/test.js.snap'));
				}, 500);
			}
		}
	});
});

test('`"tap": true` config is ignored when --watch is given', t => {
	let killed = false;

	const child = execCli(['--watch', 'test.js'], {dirname: 'fixture/watcher/tap-in-conf'}, () => {
		t.ok(killed);
		t.end();
	});

	let combined = '';
	const testOutput = output => {
		combined += output;
		t.notMatch(combined, /TAP/);
		if (/works/.test(combined)) {
			child.kill();
			killed = true;
		}
	};
	child.stdout.on('data', testOutput);
	child.stderr.on('data', testOutput);
});

test('bails when config contains `"tap": true` and `"watch": true`', t => {
	execCli(['test.js'], {dirname: 'fixture/watcher/tap-and-watch-in-conf'}, (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'The TAP reporter is not available when using watch mode.');
		t.end();
	});
});

['--watch', '-w'].forEach(watchFlag => {
	['--tap', '-t'].forEach(tapFlag => {
		test(`bails when ${tapFlag} reporter is used while ${watchFlag} is given`, t => {
			execCli([tapFlag, watchFlag, 'test.js'], {dirname: 'fixture/watcher'}, (err, stdout, stderr) => {
				t.is(err.code, 1);
				t.match(stderr, 'The TAP reporter is not available when using watch mode.');
				t.end();
			});
		});
	});
});

['--watch', '-w'].forEach(watchFlag => {
	test(`bails when CI is used while ${watchFlag} is given`, t => {
		execCli([watchFlag, 'test.js'], {dirname: 'fixture/watcher', env: {CI: true}}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'Watch mode is not available in CI, as it prevents AVA from terminating.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} provided without value`, t => {
		execCli(['test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency and -c flags must be provided the maximum number of test files to run at once.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`works when ${concurrencyFlag} provided with value`, t => {
		execCli([`${concurrencyFlag}=1`, 'test.js'], {dirname: 'fixture/concurrency'}, err => {
			t.ifError(err);
			t.end();
		});
	});
});

test('--match works', t => {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'fixture/matcher-skip.js'], err => {
		t.ifError(err);
		t.end();
	});
});

['--tap', '-t'].forEach(tapFlag => {
	test(`${tapFlag} should produce TAP output`, t => {
		execCli([tapFlag, 'test.js'], {dirname: 'fixture/watcher'}, err => {
			t.ok(!err);
			t.end();
		});
	});
});

test('handles NODE_PATH', t => {
	const nodePaths = `fixture/node-paths/modules${path.delimiter}fixture/node-paths/deep/nested`;

	execCli('fixture/node-paths.js', {env: {NODE_PATH: nodePaths}}, err => {
		t.ifError(err);
		t.end();
	});
});

test('works when no files are found', t => {
	execCli('!*', (err, stdout, stderr) => {
		t.is(err.code, 1);
		t.match(stderr, 'Couldn\'t find any files to test');
		t.end();
	});
});

test('should warn ava is required without the cli', t => {
	childProcess.execFile(process.execPath, [path.resolve(__dirname, '../index.js')], error => {
		t.ok(error);
		t.match(error.message, /Test files must be run with the AVA CLI/);
		t.end();
	});
});

test('prefers local version of ava', t => {
	execCli('', {
		dirname: 'fixture/local-bin',
		env: {
			DEBUG: 'ava'
		}
	}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, 'Using local install of AVA');
		t.end();
	});
});

test('use current working directory if `package.json` is not found', () => {
	const cwd = uniqueTempDir({create: true});
	const testFilePath = path.join(cwd, 'test.js');
	const cliPath = require.resolve('../cli.js');
	const avaPath = require.resolve('../');

	fs.writeFileSync(testFilePath, `import test from ${JSON.stringify(avaPath)};\ntest(t => { t.pass(); });`);

	return execa(process.execPath, [cliPath], {cwd});
});

test('workers ensure test files load the same version of ava', t => {
	const target = path.join(__dirname, 'fixture', 'ava-paths', 'target');

	// Copy the index.js so the testFile imports it. It should then load the correct AVA install.
	const targetInstall = path.join(target, 'node_modules/ava');
	makeDir.sync(targetInstall);
	fs.writeFileSync(
		path.join(targetInstall, 'index.js'),
		fs.readFileSync(path.join(__dirname, '../index.js'))
	);

	const testFile = path.join(target, 'test.js');
	execCli([testFile], {dirname: path.join('fixture', 'ava-paths', 'cwd')}, err => {
		t.ifError(err);
		t.end();
	});
});

test('worker errors are treated as uncaught exceptions', t => {
	execCli(['--no-color', '--verbose', 'test.js'], {dirname: 'fixture/trigger-worker-exception'}, (_, __, stderr) => {
		t.match(stderr, /Forced error/);
		t.end();
	});
});

test('uncaught exceptions are raised for worker errors even if the error cannot be serialized', t => {
	execCli(['--no-color', '--verbose', 'test-fallback.js'], {dirname: 'fixture/trigger-worker-exception'}, (_, __, stderr) => {
		t.match(stderr, /Failed to serialize uncaught exception/);
		t.end();
	});
});

test('tests without assertions do not fail if failWithoutAssertions option is set to false', t => {
	execCli([], {dirname: 'fixture/pkg-conf/fail-without-assertions'}, err => {
		t.ifError(err);
		t.end();
	});
});

test('callback tests fail if event loop empties before they\'re ended', t => {
	execCli('callback.js', {dirname: 'fixture/stalled-tests'}, (_, __, stderr) => {
		t.match(stderr, /`t\.end\(\)` was never called/);
		t.end();
	});
});

test('observable tests fail if event loop empties before they\'re resolved', t => {
	execCli('observable.js', {dirname: 'fixture/stalled-tests'}, (_, __, stderr) => {
		t.match(stderr, /Observable returned by test never completed/);
		t.end();
	});
});

test('promise tests fail if event loop empties before they\'re resolved', t => {
	execCli('promise.js', {dirname: 'fixture/stalled-tests'}, (_, __, stderr) => {
		t.match(stderr, /Promise returned by test never resolved/);
		t.end();
	});
});

for (const obj of [
	{type: 'colocated', rel: '', dir: ''},
	{type: '__tests__', rel: '__tests__-dir', dir: '__tests__/__snapshots__'},
	{type: 'test', rel: 'test-dir', dir: 'test/snapshots'},
	{type: 'tests', rel: 'tests-dir', dir: 'tests/snapshots'}
]) {
	test(`snapshots work (${obj.type})`, t => {
		const snapPath = path.join(__dirname, 'fixture', 'snapshots', obj.rel, obj.dir, 'test.js.snap');
		try {
			fs.unlinkSync(snapPath);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}

		const dirname = path.join('fixture/snapshots', obj.rel);
		// Test should pass, and a snapshot gets written
		execCli(['--update-snapshots'], {dirname}, err => {
			t.ifError(err);
			t.true(fs.existsSync(snapPath));

			// Test should pass, and the snapshot gets used
			execCli([], {dirname}, err => {
				t.ifError(err);
				t.end();
			});
		});
	});
}

test('appends to existing snapshots', t => {
	const cliPath = require.resolve('../cli.js');
	const avaPath = require.resolve('../');

	const cwd = uniqueTempDir({create: true});
	fs.writeFileSync(path.join(cwd, 'package.json'), '{}');

	const initial = `import test from ${JSON.stringify(avaPath)}
test('one', t => {
	t.snapshot({one: true})
})`;
	fs.writeFileSync(path.join(cwd, 'test.js'), initial);

	const run = () => execa(process.execPath, [cliPath, '--verbose', '--no-color'], {cwd, reject: false});
	return run().then(result => {
		t.match(result.stderr, /1 test passed/);

		fs.writeFileSync(path.join(cwd, 'test.js'), `${initial}
test('two', t => {
	t.snapshot({two: true})
})`);
		return run();
	}).then(result => {
		t.match(result.stderr, /2 tests passed/);

		fs.writeFileSync(path.join(cwd, 'test.js'), `${initial}
test('two', t => {
	t.snapshot({two: false})
})`);

		return run();
	}).then(result => {
		t.match(result.stderr, /1 test failed/);
	});
});

test('outdated snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x00, 0x00]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /The snapshot file is v0, but only v1 is supported\./);
		t.match(stderr, /File path:/);
		t.match(stderr, snapPath);
		t.match(stderr, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('newer snapshot version is reported to the console', t => {
	const snapPath = path.join(__dirname, 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0xFF, 0xFF]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /The snapshot file is v65535, but only v1 is supported\./);
		t.match(stderr, /File path:/);
		t.match(stderr, snapPath);
		t.match(stderr, /You should upgrade AVA\./);
		t.end();
	});
});

test('snapshot corruption is reported to the console', t => {
	const snapPath = path.join(__dirname, 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from([0x0A, 0x01, 0x00]));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /The snapshot file is corrupted\./);
		t.match(stderr, /File path:/);
		t.match(stderr, snapPath);
		t.match(stderr, /Please run AVA again with the .*--update-snapshots.* flag to recreate it\./);
		t.end();
	});
});

test('legacy snapshot files are reported to the console', t => {
	const snapPath = path.join(__dirname, 'fixture', 'snapshots', 'test.js.snap');
	fs.writeFileSync(snapPath, Buffer.from('// Jest Snapshot v1, https://goo.gl/fbAQLP\n'));

	execCli(['test.js'], {dirname: 'fixture/snapshots'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /The snapshot file was created with AVA 0\.19\. It's not supported by this AVA version\./);
		t.match(stderr, /File path:/);
		t.match(stderr, snapPath);
		t.match(stderr, /Please run AVA again with the .*--update-snapshots.* flag to upgrade\./);
		t.end();
	});
});

test('--no-color disables formatting colors', t => {
	execCli(['--no-color', '--verbose', 'formatting-color.js'], {dirname: 'fixture'}, (err, stdout, stderr) => {
		t.ok(err);
		t.is(stripAnsi(stderr), stderr);
		t.end();
	});
});

test('--color enables formatting colors', t => {
	execCli(['--color', '--verbose', 'formatting-color.js'], {dirname: 'fixture'}, (err, stdout, stderr) => {
		t.ok(err);
		t.isNot(stripAnsi(stderr), stderr);
		t.end();
	});
});
