'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const test = require('tap').test;
const getStream = require('get-stream');
const figures = require('figures');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const touch = require('touch');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const uniqueTempDir = require('unique-temp-dir');
const execa = require('execa');

const cliPath = path.join(__dirname, '../cli.js');

// For some reason chalk is disabled by default
chalk.enabled = true;
const colors = require('../lib/colors');

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

	if (process.env.AVA_APPVEYOR) {
		env.AVA_APPVEYOR = 1;
	}

	let child;
	let stdout;
	let stderr;

	const processPromise = new Promise(resolve => {
		child = childProcess.spawn(process.execPath, [path.relative(dirname, cliPath)].concat(args), {
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
	execCli('es2015.js', {dirname: 'fixture/invalid-babel-config'}, (err, stdout, stderr) => {
		t.ok(err);

		let expectedOutput = '\n  ';
		expectedOutput += colors.error(figures.cross) + ' Unexpected Babel configuration for AVA.';
		expectedOutput += ' See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';
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
	execCli('fixture/improper-t-throws.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws.js \(4:10\)/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', t => {
	execCli('fixture/improper-t-throws-promise.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws-promise.js \(5:11\)/);
		t.end();
	});
});

test('improper use of t.throws from within an async callback will be reported to the console', t => {
	execCli('fixture/improper-t-throws-async-callback.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws-async-callback.js \(5:11\)/);
		t.end();
	});
});

test('babel require hook only applies to the test file', t => {
	t.plan(3);

	execCli('fixture/babel-hook.js', (err, stdout, stderr) => {
		t.ok(err);
		t.is(err.code, 1);
		t.match(stderr, /Unexpected token/);
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

test('log failed tests', t => {
	execCli('fixture/one-pass-one-fail.js', (err, stdout, stderr) => {
		t.ok(err);
		t.match(stderr, /failed via t.fail\(\)/);
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

	const child = execCli(['--verbose', '--watch', '--source=source.js', 'test-*.js'], {dirname: 'fixture/watcher/with-dependencies'}, err => {
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

test('--match works', t => {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'fixture/matcher-skip.js'], err => {
		t.ifError(err);
		t.end();
	});
});

['--tap', '-t'].forEach(tapFlag => {
	test(tapFlag + ' should produce TAP output', t => {
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
	t.plan(1);

	const stubModulePath = path.join(__dirname, '/fixture/empty');
	const debugSpy = sinon.spy();
	const resolveCwdStub = () => stubModulePath;

	function debugStub() {
		return message => {
			let result = {
				enabled: false
			};

			if (message) {
				result = debugSpy(message);
			}

			return result;
		};
	}

	proxyquire('../cli', {
		debug: debugStub,
		'resolve-cwd': resolveCwdStub
	});

	t.ok(debugSpy.calledWith('Using local install of AVA'));
	t.end();
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
	mkdirp.sync(targetInstall);
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
