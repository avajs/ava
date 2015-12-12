'use strict';
var childProcess = require('child_process');
var figures = require('figures');
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

test('display test title prefixes', function (t) {
	t.plan(6);

	execCli([
		'fixture/async-await.js',
		'fixture/es2015.js',
		'fixture/generators.js'
	], function (err, stdout, stderr) {
		t.ifError(err);

		// remove everything except test list
		var output = stderr
			.replace(/[0-9] tests passed/, '')
			.replace(new RegExp(figures.tick, 'gm'), '')
			.replace(/^\s+/gm, '')
			.trim();

		var separator = ' ' + figures.pointerSmall + ' ';

		// expected output
		var tests = [
			['async-await', 'async function'].join(separator),
			['async-await', 'arrow async function'].join(separator),
			['generators', 'generator function'].join(separator),
			['es2015', '[anonymous]'].join(separator)
		];

		// check if each line in actual output
		// exists in expected output
		output.split('\n').forEach(function (line) {
			var index = tests.indexOf(line);

			t.true(index >= 0);

			// remove line from expected output
			tests.splice(index, 1);
		});

		// if all lines were removed from expected output
		// actual output matches expected output
		t.is(tests.length, 0);
	});
});

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
		t.true(/\[Function: fooFn]/.test(stderr));
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('babel require hook only applies to the test file', function (t) {
	t.plan(3);

	execCli('fixture/babel-hook.js', function (err, stdout, stderr) {
		t.ok(err);
		t.match(stderr, /Unexpected token/);
		t.is(err.code, 1);
		t.end();
	});
});

test('throwing a anonymous function will report the function to the console', function (t) {
	execCli('fixture/throw-anonymous-function.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/\[Function: anonymous]/.test(stderr));
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});
