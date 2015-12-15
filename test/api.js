'use strict';
var path = require('path');
var figures = require('figures');
var test = require('tap').test;
var Api = require('../api');

test('ES2015 support', function (t) {
	t.plan(1);

	var api = new Api([path.join(__dirname, 'fixture/es2015.js')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('generators support', function (t) {
	t.plan(1);

	var api = new Api([path.join(__dirname, 'fixture/generators.js')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('async/await support', function (t) {
	t.plan(1);

	var api = new Api([path.join(__dirname, 'fixture/async-await.js')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 2);
		});
});

test('test title prefixes', function (t) {
	t.plan(5);

	var separator = ' ' + figures.pointerSmall + ' ';
	var files = [
		path.join(__dirname, 'fixture/async-await.js'),
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/generators.js')
	];
	var expected = [
		['async-await', 'async function'].join(separator),
		['async-await', 'arrow async function'].join(separator),
		['es2015', '[anonymous]'].join(separator),
		['generators', 'generator function'].join(separator)
	];
	var index;

	var api = new Api(files);

	api.run()
		.then(function () {
			// if all lines were removed from expected output
			// actual output matches expected output
			t.is(expected.length, 0);
		});

	api.on('test', function (a) {
		var unnecessaryString = 'test' + separator + 'fixture' + separator;
		index = expected.indexOf(a.title.replace(unnecessaryString, ''));

		t.true(index >= 0);

		// remove line from expected output
		expected.splice(index, 1);
	});
});

test('display filename prefixes for failed test stack traces', function (t) {
	t.plan(3);

	var files = [
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/one-pass-one-fail.js')
	];

	var api = new Api(files);

	api.run()
		.then(function () {
			t.is(api.passCount, 2);
			t.is(api.failCount, 1);
			t.match(api.errors[0].title, /test \S fixture \S one-pass-one-fail \S this is a failing test/);
		});
});

test('fail-fast mode', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/fail-fast.js')], {
		failFast: true
	});

	api.run()
		.then(function () {
			t.ok(api.options.failFast);
			t.is(api.passCount, 1);
			t.is(api.failCount, 1);
			t.match(api.errors[0].error.message, /Test failed via t.fail()/);
		});
});

test('serial execution mode', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/async-await.js')], {
		serial: true
	});

	api.run()
		.then(function () {
			t.ok(api.options.serial);
			t.is(api.passCount, 2);
		});
});

test('circular references on assertions do not break process.send', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/circular-reference-on-assertion.js')]);

	api.run()
		.then(function () {
			t.is(api.failCount, 1);
			t.match(api.errors[0].error.message, /'c'.*?'d'/);
		});
});

test('change process.cwd() to a test\'s directory', function (t) {
	t.plan(1);

	var api = new Api([path.join(__dirname, 'fixture/process-cwd.js')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('unhandled promises will throw an error', function (t) {
	t.plan(3);

	var api = new Api([path.join(__dirname, 'fixture/loud-rejection.js')]);

	api.on('error', function (data) {
		t.is(data.name, 'Error');
		t.match(data.message, /You can\'t handle this!/);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('uncaught exception will throw an error', function (t) {
	t.plan(3);

	var api = new Api([path.join(__dirname, 'fixture/uncaught-exception.js')]);

	api.on('error', function (data) {
		t.is(data.name, 'Error');
		t.match(data.message, /Can\'t catch me!/);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map file', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/source-map-file.js')]);

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?at.*?run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?at\b.*source-map-file.js:11.*$/m);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/source-map-initial.js')]);

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?at.*?run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?at\b.*source-map-initial-input.js:7.*$/m);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('absolute paths', function (t) {
	t.plan(1);

	var api = new Api([path.resolve('test/fixture/es2015.js')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('titles of both passing and failing tests and AssertionErrors are returned', function (t) {
	t.plan(3);

	var api = new Api([path.join(__dirname, 'fixture/one-pass-one-fail.js')]);

	api.run()
		.then(function () {
			t.match(api.errors[0].title, /this is a failing test/);
			t.match(api.tests[0].title, /this is a passing test/);
			t.match(api.errors[0].error.name, /AssertionError/);
		});
});

test('empty test files creates a failure with a helpful warning', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/empty.js')]);

	api.run()
		.catch(function (err) {
			t.ok(err);
			t.match(err.message, /No tests found.*?import "ava"/);
		});
});

test('test file with no tests creates a failure with a helpful warning', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/no-tests.js')]);

	api.run()
		.catch(function (err) {
			t.ok(err);
			t.match(err.message, /No tests/);
		});
});

test('test file that immediately exits with 0 exit code ', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/immediate-0-exit.js')]);

	api.run()
		.catch(function (err) {
			t.ok(err);
			t.match(err.message, /Test results were not received from/);
		});
});

test('testing nonexistent files rejects', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/broken.js')]);

	api.run()
		.catch(function (err) {
			t.ok(err);
			t.match(err.message, /Couldn't find any files to test/);
		});
});

test('test file in node_modules is ignored', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/node_modules/test.js')]);

	api.run()
		.catch(function (err) {
			t.ok(err);
			t.match(err.message, /Couldn't find any files to test/);
		});
});

test('Node.js-style --require CLI argument', function (t) {
	t.plan(1);

	var api = new Api(
		[path.join(__dirname, 'fixture/validate-installed-global.js')],
		{require: [path.join(__dirname, 'fixture', 'install-global.js')]}
	);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('power-assert support', function (t) {
	t.plan(3);

	var api = new Api([path.join(__dirname, 'fixture/power-assert.js')]);

	api.run()
		.then(function () {
			t.ok(api.errors[0].error.powerAssertContext);

			t.match(
				api.errors[0].error.message,
				/t\.ok\(a === 'bar'\)\s*\n\s+\|\s*\n\s+"foo"/m
			);

			t.match(
				api.errors[1].error.message,
				/with message\s+t\.ok\(a === 'foo', 'with message'\)\s*\n\s+\|\s*\n\s+"bar"/m
			);
		});
});
