'use strict';
var path = require('path');
var childProcess = require('child_process');
var test = require('tap').test;
global.Promise = require('bluebird');
var getStream = require('get-stream');
var arrify = require('arrify');
var cliPath = path.join(__dirname, '../cli.js');

function execCli(args, dirname, cb) {
	if (typeof dirname === 'function') {
		cb = dirname;
		dirname = __dirname;
	} else {
		dirname = path.join(__dirname, dirname);
	}

	var env = {};

	if (process.env.AVA_APPVEYOR) {
		env.AVA_APPVEYOR = 1;
	}

	var stdout;
	var stderr;

	var processPromise = new Promise(function (resolve) {
		var child = childProcess.spawn(process.execPath, [path.relative(dirname, cliPath)].concat(arrify(args)), {
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
		t.match(stderr, /AssertionError: false == true/);
		t.end();
	});
});

test('pkg-conf: defaults', function (t) {
	execCli([], 'fixture/pkg-conf/defaults', function (err) {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: pkg-overrides', function (t) {
	execCli([], 'fixture/pkg-conf/pkg-overrides', function (err) {
		t.ifError(err);
		t.end();
	});
});

test('pkg-conf: cli takes precedence', function (t) {
	execCli(['--no-serial', '--cache', '--no-fail-fast', '--require=./required.js', 'c.js'], 'fixture/pkg-conf/precedence', function (err) {
		t.ifError(err);
		t.end();
	});
});
