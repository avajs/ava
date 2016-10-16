'use strict';
var path = require('path');
var childProcess = require('child_process');
var test = require('tap').test;
global.Promise = require('bluebird');
var getStream = require('get-stream');
var figures = require('figures');
var arrify = require('arrify');
var chalk = require('chalk');
var touch = require('touch');
var proxyquire = require('proxyquire');
var sinon = require('sinon');

var cliPath = path.join(__dirname, '../cli.js');

// for some reason chalk is disabled by default
chalk.enabled = true;
var colors = require('../lib/colors');

function execCli(args, opts, cb) {
	var dirname;
	var env;

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

	var child;
	var stdout;
	var stderr;

	var processPromise = new Promise(function (resolve) {
		child = childProcess.spawn(process.execPath, [path.relative(dirname, cliPath)].concat(arrify(args)), {
			cwd: dirname,
			env: env,
			stdio: [null, 'pipe', 'pipe']
		});

		child.on('close', function (code, signal) {
			if (code) {
				var err = new Error('test-worker exited with a non-zero exit code: ' + code);
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

	Promise.all([processPromise, stdout, stderr]).then(function (args) {
		cb.apply(null, args);
	});

	return child;
}

test('disallow invalid babel config shortcuts', function (t) {
	execCli('es2015.js', {dirname: 'fixture/invalid-babel-config'}, function (err, stdout) {
		t.ok(err);

		var expectedOutput = '\n  ';
		expectedOutput += colors.error(figures.cross) + ' Unexpected Babel configuration for AVA.';
		expectedOutput += ' See ' + chalk.underline('https://github.com/avajs/ava#es2015-support') + ' for allowed values.';
		expectedOutput += '\n';

		t.is(stdout, expectedOutput);
		t.end();
	});
});

test('timeout', function (t) {
	execCli(['fixture/long-running.js', '-T', '1s'], function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /Exited because no new tests completed within the last 1000ms of inactivity/);
		t.end();
	});
});

test('throwing a named function will report the to the console', function (t) {
	execCli('fixture/throw-named-function.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /function fooFn\(\) \{\}/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('improper use of t.throws will be reported to the console', function (t) {
	execCli('fixture/improper-t-throws.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws.js \(4:10\)/);
		t.end();
	});
});

test('improper use of t.throws from within a Promise will be reported to the console', function (t) {
	execCli('fixture/improper-t-throws-promise.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws-promise.js \(5:11\)/);
		t.end();
	});
});

test('improper use of t.throws from within an async callback will be reported to the console', function (t) {
	execCli('fixture/improper-t-throws-async-callback.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /Improper usage of t\.throws detected at .*improper-t-throws-async-callback.js \(5:11\)/);
		t.end();
	});
});

test('babel require hook only applies to the test file', function (t) {
	t.plan(3);

	execCli('fixture/babel-hook.js', function (err, stdout, stderr) {
		t.ok(err);
		t.is(err.code, 1);
		t.match(stderr, /Unexpected token/);
		t.end();
	});
});

test('throwing a anonymous function will report the function to the console', function (t) {
	execCli('fixture/throw-anonymous-function.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /function \(\) \{\}/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('log failed tests', function (t) {
	execCli('fixture/one-pass-one-fail.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /failed via t.fail\(\)/);
		t.end();
	});
});

test('pkg-conf: defaults', function (t) {
	execCli([], {dirname: 'fixture/pkg-conf/defaults'}, function (err) {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: pkg-overrides', function (t) {
	execCli([], {dirname: 'fixture/pkg-conf/pkg-overrides'}, function (err) {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: cli takes precedence', function (t) {
	execCli(['--match=foo*', '--no-serial', '--cache', '--no-fail-fast', 'c.js'], {dirname: 'fixture/pkg-conf/precedence'}, function (err) {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf(resolve-dir): works as expected when run from the package.json directory', function (t) {
	execCli(['--verbose'], {dirname: 'fixture/pkg-conf/resolve-dir'}, function (err, stdout, stderr) {
		t.ifError(err);
		t.match(stderr, /dir-a-base-1/);
		t.match(stderr, /dir-a-base-2/);
		t.notMatch(stderr, /dir-a-wrapper/);
		t.notMatch(stdout, /dir-a-wrapper/);
		t.end();
	});
});

test('pkg-conf(resolve-dir): resolves tests from the package.json dir if none are specified on cli', function (t) {
	execCli(['--verbose'], {dirname: 'fixture/pkg-conf/resolve-dir/dir-a-wrapper'}, function (err, stdout, stderr) {
		t.ifError(err);
		t.match(stderr, /dir-a-base-1/);
		t.match(stderr, /dir-a-base-2/);
		t.notMatch(stderr, /dir-a-wrapper/);
		t.notMatch(stdout, /dir-a-wrapper/);
		t.end();
	});
});

test('pkg-conf(resolve-dir): resolves tests process.cwd() if globs are passed on the command line', function (t) {
	execCli(['--verbose', 'dir-a/*.js'], {dirname: 'fixture/pkg-conf/resolve-dir/dir-a-wrapper'}, function (err, stdout, stderr) {
		t.ifError(err);
		t.match(stderr, /dir-a-wrapper-3/);
		t.match(stderr, /dir-a-wrapper-4/);
		t.notMatch(stderr, /dir-a-base/);
		t.notMatch(stdout, /dir-a-base/);
		t.end();
	});
});

test('watcher reruns test files when they changed', function (t) {
	var killed = false;

	var child = execCli(['--verbose', '--watch', 'test.js'], {dirname: 'fixture/watcher'}, function (err) {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	var buffer = '';
	var passedFirst = false;
	child.stderr.on('data', function (str) {
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

test('watcher reruns test files when source dependencies change', function (t) {
	var killed = false;

	var child = execCli(['--verbose', '--watch', '--source=source.js', 'test-*.js'], {dirname: 'fixture/watcher/with-dependencies'}, function (err) {
		t.ok(killed);
		t.ifError(err);
		t.end();
	});

	var buffer = '';
	var passedFirst = false;
	child.stderr.on('data', function (str) {
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

test('`"tap": true` config is ignored when --watch is given', function (t) {
	var killed = false;

	var child = execCli(['--watch', 'test.js'], {dirname: 'fixture/watcher/tap-in-conf'}, function () {
		t.ok(killed);
		t.end();
	});

	var combined = '';
	var testOutput = function (output) {
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

test('bails when config contains `"tap": true` and `"watch": true`', function (t) {
	execCli(['test.js'], {dirname: 'fixture/watcher/tap-and-watch-in-conf'}, function (err, stdout, stderr) {
		t.is(err.code, 1);
		t.match(stderr, 'The TAP reporter is not available when using watch mode.');
		t.end();
	});
});

['--watch', '-w'].forEach(function (watchFlag) {
	['--tap', '-t'].forEach(function (tapFlag) {
		test('bails when ' + tapFlag + ' reporter is used while ' + watchFlag + ' is given', function (t) {
			execCli([tapFlag, watchFlag, 'test.js'], {dirname: 'fixture/watcher'}, function (err, stdout, stderr) {
				t.is(err.code, 1);
				t.match(stderr, 'The TAP reporter is not available when using watch mode.');
				t.end();
			});
		});
	});
});

test('--match works', function (t) {
	execCli(['-m=foo', '-m=bar', '-m=!baz', '-m=t* a* f*', '-m=!t* a* n* f*', 'fixture/matcher-skip.js'], function (err) {
		t.ifError(err);
		t.end();
	});
});

['--tap', '-t'].forEach(function (tapFlag) {
	test(tapFlag + ' should produce TAP output', function (t) {
		execCli([tapFlag, 'test.js'], {dirname: 'fixture/watcher'}, function (err) {
			t.ok(!err);
			t.end();
		});
	});
});

test('handles NODE_PATH', function (t) {
	var nodePaths = 'fixture/node-paths/modules' + path.delimiter + 'fixture/node-paths/deep/nested';

	execCli('fixture/node-paths.js', {env: {NODE_PATH: nodePaths}}, function (err) {
		t.ifError(err);
		t.end();
	});
});

test('works when no files are found', function (t) {
	execCli('!*', function (err, stdout, stderr) {
		t.is(err.code, 1);
		t.match(stderr, 'Couldn\'t find any files to test');
		t.end();
	});
});

test('should warn ava is required without the cli', function (t) {
	childProcess.execFile(process.execPath, [path.resolve(__dirname, '../index.js')], function (error) {
		t.ok(error);
		t.match(error.message, /Test files must be run with the AVA CLI/);
		t.end();
	});
});

test('prefers local version of ava', function (t) {
	t.plan(1);

	var stubModulePath = path.join(__dirname, '/fixture/empty');
	var debugSpy = sinon.spy();
	function resolveCwdStub() {
		return stubModulePath;
	}
	function debugStub() {
		return function (message) {
			var result = {
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
