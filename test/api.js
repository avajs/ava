'use strict';
var path = require('path');
var figures = require('figures');
var rimraf = require('rimraf');
var fs = require('fs');
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

test('test title prefixes — multiple files', function (t) {
	t.plan(6);

	var separator = ' ' + figures.pointerSmall + ' ';
	var files = [
		path.join(__dirname, 'fixture/async-await.js'),
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/generators.js'),
		path.join(__dirname, 'fixture/subdir/in-a-subdir.js')
	];
	var expected = [
		['async-await', 'async function'].join(separator),
		['async-await', 'arrow async function'].join(separator),
		['es2015', '[anonymous]'].join(separator),
		['generators', 'generator function'].join(separator),
		['subdir', 'in-a-subdir', 'subdir'].join(separator)
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
		index = expected.indexOf(a.title);

		t.true(index >= 0);

		// remove line from expected output
		expected.splice(index, 1);
	});
});

test('test title prefixes — single file', function (t) {
	t.plan(2);

	var separator = ' ' + figures.pointerSmall + ' ';
	var files = [
		path.join(__dirname, 'fixture/generators.js')
	];
	var expected = [
		['generator function'].join(separator)
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
		index = expected.indexOf(a.title);

		t.true(index >= 0);

		// remove line from expected output
		expected.splice(index, 1);
	});
});

test('test title prefixes — single file (explicit)', function (t) {
	t.plan(2);

	var separator = ' ' + figures.pointerSmall + ' ';
	var files = [
		path.join(__dirname, 'fixture/generators.js')
	];
	var expected = [
		['generators', 'generator function'].join(separator)
	];
	var index;

	var api = new Api();

	api.run(files)
		.then(function () {
			// if all lines were removed from expected output
			// actual output matches expected output
			t.is(expected.length, 0);
		});

	api.on('test', function (a) {
		index = expected.indexOf(a.title);

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
			t.match(api.errors[0].title, /one-pass-one-fail \S this is a failing test/);
		});
});

// This is a seperate test because we can't ensure the order of the errors (to match them), and this is easier than
// sorting.
test('display filename prefixes for failed test stack traces in subdirs', function (t) {
	t.plan(3);

	var files = [
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/subdir/failing-subdir.js')
	];

	var api = new Api(files);

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
			t.is(api.failCount, 1);
			t.match(api.errors[0].title, /subdir \S failing-subdir \S subdir fail/);
		});
});

test('fail-fast mode', function (t) {
	t.plan(5);

	var api = new Api([path.join(__dirname, 'fixture/fail-fast.js')], {
		failFast: true
	});

	var tests = [];

	api.on('test', function (test) {
		tests.push({
			ok: !test.error,
			title: test.title
		});
	});

	api.run()
		.then(function () {
			t.ok(api.options.failFast);
			t.same(tests, [{
				ok: true,
				title: 'first pass'
			}, {
				ok: false,
				title: 'second fail'
			}]);
			t.is(api.passCount, 1);
			t.is(api.failCount, 1);
			t.match(api.errors[0].error.message, /Test failed via t.fail()/);
		});
});

test('serial execution mode', function (t) {
	t.plan(3);

	var api = new Api([path.join(__dirname, 'fixture/serial.js')], {
		serial: true
	});

	api.run()
		.then(function () {
			t.ok(api.options.serial);
			t.is(api.passCount, 3);
			t.is(api.failCount, 0);
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

	var api = new Api([path.join(__dirname, 'fixture/source-map-file.js')], {cacheEnabled: true});

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:11.*$/m);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map file (cache off)', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/source-map-file.js')], {cacheEnabled: false});

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:11.*$/m);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache on)', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/source-map-initial.js')], {cacheEnabled: true});

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:7.*$/m);
	});

	api.run()
		.then(function () {
			t.is(api.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache off)', function (t) {
	t.plan(4);

	var api = new Api([path.join(__dirname, 'fixture/source-map-initial.js')], {cacheEnabled: false});

	api.on('error', function (data) {
		t.match(data.message, /Thrown by source-map-fixtures/);
		t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
		t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:7.*$/m);
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

test('search directories recursively for files', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/subdir')]);

	api.run()
		.then(function () {
			t.is(api.passCount, 2);
			t.is(api.failCount, 1);
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

test('empty test files cause an AvaError to be emitted', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/empty.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /No tests found.*?import "ava"/);
	});

	return api.run();
});

test('test file with no tests causes an AvaError to be emitted', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/no-tests.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /No tests/);
	});

	return api.run();
});

test('test file that immediately exits with 0 exit code ', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/immediate-0-exit.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Test results were not received from/);
	});

	return api.run();
});

test('testing nonexistent files causes an AvaError to be emitted', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/broken.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run();
});

test('test file in node_modules is ignored', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/ignored-dirs/node_modules/test.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run();
});

test('test file in node_modules is ignored (explicit)', function (t) {
	t.plan(2);

	var api = new Api();

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/node_modules/test.js')]);
});

test('test file in fixtures is ignored', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/ignored-dirs/fixtures/test.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run();
});

test('test file in fixtures is ignored (explicit)', function (t) {
	t.plan(2);

	var api = new Api();

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/fixtures/test.js')]);
});

test('test file in helpers is ignored', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/ignored-dirs/helpers/test.js')]);

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run();
});

test('test file in helpers is ignored (explicit)', function (t) {
	t.plan(2);

	var api = new Api();

	api.on('error', function (err) {
		t.is(err.name, 'AvaError');
		t.match(err.message, /Couldn't find any files to test/);
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/helpers/test.js')]);
});

test('Node.js-style --require CLI argument', function (t) {
	t.plan(1);

	var requirePath = './' + path.relative('.', path.join(__dirname, 'fixture/install-global.js')).replace(/\\/g, '/');

	var api = new Api(
		[path.join(__dirname, 'fixture/validate-installed-global.js')],
		{require: [requirePath]}
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

test('caching is enabled by default', function (t) {
	t.plan(3);
	rimraf.sync(path.join(__dirname, 'fixture/caching/node_modules'));
	var api = new Api([path.join(__dirname, 'fixture/caching/test.js')]);

	api.run()
		.then(function () {
			var files = fs.readdirSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava'));
			t.is(files.length, 2);
			t.is(files.filter(endsWithJs).length, 1);
			t.is(files.filter(endsWithMap).length, 1);
			t.end();
		});

	function endsWithJs(filename) {
		return /\.js$/.test(filename);
	}

	function endsWithMap(filename) {
		return /\.js$/.test(filename);
	}
});

test('caching can be disabled', function (t) {
	t.plan(1);
	rimraf.sync(path.join(__dirname, 'fixture/caching/node_modules'));
	var api = new Api([path.join(__dirname, 'fixture/caching/test.js')], {cacheEnabled: false});

	api.run()
		.then(function () {
			t.false(fs.existsSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava')));
			t.end();
		});
});

test('test file with only skipped tests does not create a failure', function (t) {
	t.plan(2);

	var api = new Api([path.join(__dirname, 'fixture/skip-only.js')]);

	api.run()
		.then(function () {
			t.is(api.tests.length, 1);
			t.true(api.tests[0].skip);
		});
});

test('resets state before running', function (t) {
	t.plan(2);

	var api = new Api([path.resolve('test/fixture/es2015.js')]);

	api.run().then(function () {
		t.is(api.passCount, 1);
		return api.run();
	}).then(function () {
		t.is(api.passCount, 1);
	});
});
