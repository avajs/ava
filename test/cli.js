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
const Buffer = require('safe-buffer').Buffer;
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
		expectedOutput += ' See https://github.com/avajs/ava/blob/master/docs/recipes/babel.md for allowed values.';
		expectedOutput += '\n';

		t.is(stderr, expectedOutput);
		t.end();
	});
});

test('enabling long stack traces will provide detailed debug information', t => {
	execCli('fixture/long-stack-trace', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /From previous event/);
		t.end();
	});
});

test('`AssertionError` should capture infinity stack trace', t => {
	execCli('fixture/infinity-stack-trace.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /c \(.+?infinity-stack-trace\.js:6:20\)/);
		t.match(stderr, /b \(.+?infinity-stack-trace\.js:7:18\)/);
		t.match(stderr, /a \(.+?infinity-stack-trace\.js:8:18\)/);
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

test('include anonymous functions in error reports', t => {
	execCli('fixture/error-in-anonymous-function.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /test\/fixture\/error-in-anonymous-function\.js:4:8/);
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

test('precompiler require hook does not apply to source files', t => {
	t.plan(3);

	execCli('fixture/babel-hook.js', (err, stdout, stderr) => {
		t.ok(err);
		t.is(err.code, 1);
		t.match(stderr, /Unexpected (token|reserved word)/);
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

	const child = execCli(['--watch', '--verbose', 'test.js'], {dirname: 'fixture/watcher/tap-in-conf'}, () => {
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
	test(`bails when ${concurrencyFlag} is provided without value`, t => {
		execCli(['test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is a string`, t => {
		execCli([`${concurrencyFlag}=foo`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is a float`, t => {
		execCli([`${concurrencyFlag}=4.7`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is negative`, t => {
		execCli([`${concurrencyFlag}=-1`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`works when ${concurrencyFlag} is provided with a value`, t => {
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

	fs.writeFileSync(testFilePath, `import test from ${JSON.stringify(avaPath)};\ntest('test', t => { t.pass(); });`);

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

test('snapshots infer their location from sourcemaps', t => {
	t.plan(8);
	const relativeFixtureDir = path.join('fixture/snapshots/test-sourcemaps');
	const snapDirStructure = [
		'src',
		'src/test/snapshots',
		'src/feature/__tests__/__snapshots__'
	];
	const snapFixtureFilePaths = snapDirStructure
		.map(snapRelativeDir => {
			const snapPath = path.join(__dirname, relativeFixtureDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.js.md'),
				path.join(snapPath, 'test.js.snap')
			];
		})
		.reduce((a, b) => a.concat(b), []);
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
	};
	snapFixtureFilePaths.forEach(x => removeExistingSnapFixtureFiles(x));
	const verifySnapFixtureFiles = relFilePath => {
		t.true(fs.existsSync(relFilePath));
	};
	execCli([], {dirname: relativeFixtureDir}, (err, stdout, stderr) => {
		t.ifError(err);
		snapFixtureFilePaths.forEach(x => verifySnapFixtureFiles(x));
		t.match(stderr, /6 passed/);
		t.end();
	});
});

test('snapshots resolved location from "snapshotDir" in AVA config', t => {
	t.plan(8);
	const relativeFixtureDir = 'fixture/snapshots/test-snapshot-location';
	const snapDir = 'snapshot-fixtures';
	const snapDirStructure = [
		'src',
		'src/feature',
		'src/feature/nested-feature'
	];
	const snapFixtureFilePaths = snapDirStructure
		.map(snapRelativeDir => {
			const snapPath = path.join(__dirname, relativeFixtureDir, snapDir, snapRelativeDir);
			return [
				path.join(snapPath, 'test.js.md'),
				path.join(snapPath, 'test.js.snap')
			];
		})
		.reduce((a, b) => a.concat(b), []);
	const removeExistingSnapFixtureFiles = snapPath => {
		try {
			fs.unlinkSync(snapPath);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
	};
	snapFixtureFilePaths.forEach(x => removeExistingSnapFixtureFiles(x));
	const verifySnapFixtureFiles = relFilePath => {
		t.true(fs.existsSync(relFilePath));
	};
	execCli([], {dirname: relativeFixtureDir}, (err, stdout, stderr) => {
		t.ifError(err);
		snapFixtureFilePaths.forEach(x => verifySnapFixtureFiles(x));
		t.match(stderr, /6 passed/);
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

test('sets NODE_ENV to test when it is not set', t => {
	execCli([path.join('fixture', 'node-env-test.js')], {env: {}}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /1 passed/);
		t.end();
	});
});

test('doesn\'t set NODE_ENV when it is set', t => {
	execCli([path.join('fixture', 'node-env-foo.js')], {env: {NODE_ENV: 'foo'}}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /1 passed/);
		t.end();
	});
});

test('skips test file compilation when babel=false and compileEnhancements=false', t => {
	execCli(['import.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /SyntaxError: Unexpected (reserved word|token import)/);
		t.end();
	});
});

test('skips helper file compilation when babel=false and compileEnhancements=false', t => {
	execCli(['require-helper.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout, stderr) => {
		t.ifError(err);
		t.match(stderr, /1 passed/);
		t.end();
	});
});

test('no power-assert when babel=false and compileEnhancements=false', t => {
	execCli(['no-power-assert.js'], {dirname: 'fixture/no-babel-compilation'}, (err, stdout, stderr) => {
		t.ok(err);
		t.notMatch(stripAnsi(stderr), /bool\n.*=> false/);
		t.end();
	});
});

test('skips stage-4 transform when babel=false and compileEnhancements=true', t => {
	execCli(['import.js'], {dirname: 'fixture/just-enhancement-compilation'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /SyntaxError: Unexpected (reserved word|token import)/);
		t.end();
	});
});

test('power-assert when babel=false and compileEnhancements=true', t => {
	execCli(['power-assert.js'], {dirname: 'fixture/just-enhancement-compilation'}, (err, stdout, stderr) => {
		t.ok(err);
		t.match(stripAnsi(stderr), /bool\n.*=> false/);
		t.end();
	});
});

test('workers load compiled helpers if in the require configuration', t => {
	execCli(['test/verify.js'], {dirname: 'fixture/require-compiled-helper'}, err => {
		t.ifError(err);
		t.end();
	});
});
