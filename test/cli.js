'use strict';
var path = require('path');
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

test('throwing a anonymous function will report the function to the console', function (t) {
	execCli('fixture/throw-anonymous-function.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/\[Function: anonymous]/.test(stderr));
		// TODO(jamestalmage)
		// t.ok(/1 uncaught exception[^s]/.test(stdout));
		t.end();
	});
});

test('stack traces for exceptions are corrected using a source map file', function (t) {
	execCli('fixture/source-map-file.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/Thrown by source-map-fixtures/.test(stderr));
		t.match(stderr, /^.*?at.*?run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(stderr, /^.*?at\b.*source-map-file.js:11.*$/m);
		t.end();
	});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account', function (t) {
	execCli('fixture/source-map-initial.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/Thrown by source-map-fixtures/.test(stderr));
		t.match(stderr, /^.*?at.*?run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(stderr, /^.*?at\b.*source-map-initial-input.js:7.*$/m);
		t.end();
	});
});

test('absolute paths in CLI', function (t) {
	t.plan(2);

	execCli([path.resolve('test/fixture/es2015.js')], function (err, stdout, stderr) {
		t.ifError(err);
		t.is(stderr.trim(), '1 test passed');
		t.end();
	});
});

test('titles of both passing and failing tests and AssertionErrors are displayed', function (t) {
	t.plan(4);

	execCli('fixture/one-pass-one-fail.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/this is a passing test/.test(stderr));
		t.true(/this is a failing test/.test(stderr));
		t.true(/AssertionError/.test(stderr));
		t.end();
	});
});

test('empty test files creates a failure with a helpful warning', function (t) {
	t.plan(2);

	execCli('fixture/empty.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/No tests found.*?import "ava"/.test(stderr));
		t.end();
	});
});

test('test file with no tests creates a failure with a helpful warning', function (t) {
	t.plan(2);

	execCli('fixture/no-tests.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/No tests/.test(stderr));
		t.end();
	});
});

test('test file that immediately exits with 0 exit code ', function (t) {
	t.plan(2);

	execCli('fixture/immediate-0-exit.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/Test results were not received from/.test(stderr));
		t.end();
	});
});

test('test file in node_modules is ignored', function (t) {
	execCli('fixture/node_modules/test.js', function (err, stdout, stderr) {
		t.ok(err);
		t.true(/Couldn't find any files to test/.test(stderr));
		t.end();
	});
});
