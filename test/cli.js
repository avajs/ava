'use strict';
var childProcess = require('child_process');
var test = require('tap').test;
global.Promise = require('bluebird');
var getStream = require('get-stream');

function execCli(args, cb) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	var env = {};

	if (process.env.AVA_APPVEYOR) {
		env.AVA_APPVEYOR = 1;
	}

	var stdout;
	var stderr;

	var processPromise = new Promise(function (resolve) {
		var child = childProcess.spawn(process.execPath, ['../cli.js'].concat(args), {
			cwd: __dirname,
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
