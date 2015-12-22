'use strict';
var childProcess = require('child_process');
var test = require('tap').test;

function execCli(args, cb) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	var env = {};

	if (process.env.AVA_APPVEYOR) {
		env.AVA_APPVEYOR = 1;
	}

	childProcess.execFile(process.execPath, ['../cli.js'].concat(args), {
		cwd: __dirname,
		env: env
	}, cb);
}

test('don\'t display test title if there is only one anonymous test', function (t) {
	t.plan(2);

	execCli(['fixture/es2015.js'], function (err, stdout, stderr) {
		t.ifError(err);
		t.is(stderr.trim(), '1 test passed');
		t.end();
	});
});

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
