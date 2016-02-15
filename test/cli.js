'use strict';
var path = require('path');
var childProcess = require('child_process');
var test = require('tap').test;
global.Promise = require('bluebird');
var getStream = require('get-stream');
var arrify = require('arrify');
var touch = require('touch');
var cliPath = path.join(__dirname, '../cli.js');

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

test('throwing a named function will report the to the console', function (t) {
	execCli('fixture/throw-named-function.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /\[Function: fooFn]/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
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
		t.match(stderr, /\[Function: anonymous]/);
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('log failed tests', function (t) {
	execCli('fixture/one-pass-one-fail.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /AssertionError: false == true/);
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
	execCli(['--no-serial', '--cache', '--no-fail-fast', '--require=./required.js', 'c.js'], {dirname: 'fixture/pkg-conf/precedence'}, function (err) {
		t.ifError(err);
		t.end();
	});
});

test('watcher works', function (t) {
	var killed = false;

	var hasChokidar = false;
	try {
		require('chokidar');
		hasChokidar = true;
	} catch (err) {}

	var child = execCli(['--verbose', '--watch', 'test.js'], {dirname: 'fixture/watcher'}, function (err, stdout) {
		if (err && err.code === 1 && !hasChokidar) {
			t.comment('chokidar dependency is missing, cannot test watcher');
			t.match(stdout, 'The optional dependency chokidar failed to install and is required for --watch. Chokidar is likely not supported on your platform.');
			t.end();
		} else {
			t.ok(killed);
			t.ifError(err);
			t.end();
		}
	});

	var buffer = '';
	var passedFirst = false;
	// Pause the stream before attaching the 'data' listener. execCli() uses
	// get-stream which read()s from the stream. The test just needs to piggyback
	// on that without switching the stream to flowing mode.
	child.stderr.pause().on('data', function (str) {
		buffer += str;
		if (/1 test passed/.test(str)) {
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

test('handles NODE_PATH', function (t) {
	var nodePaths = 'node-paths/modules' + path.delimiter + 'node-paths/deep/nested';
	execCli('fixture/node-paths.js', {env: {NODE_PATH: nodePaths}}, function (err) {
		t.notOk(err);
		t.end();
	});
});
