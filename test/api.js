'use strict';
const path = require('path');
const fs = require('fs');
const figures = require('figures');
const del = require('del');
const test = require('tap').test;
const Api = require('../api');

const testCapitalizerPlugin = require.resolve('./fixture/babel-plugin-test-capitalizer');

const ROOT_DIR = path.join(__dirname, '..');

function apiCreator(options) {
	options = options || {};
	options.babelConfig = options.babelConfig || {testOptions: {}};
	options.concurrency = 2;
	options.projectDir = options.projectDir || ROOT_DIR;
	options.resolveTestsFrom = options.resolveTestsFrom || options.projectDir;
	const instance = new Api(options);
	if (!options.precompileHelpers) {
		instance._precompileHelpers = () => Promise.resolve();
	}
	return instance;
}

test('ES2015 support', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/es2015.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('precompile helpers', t => {
	const api = apiCreator({
		precompileHelpers: true,
		resolveTestsFrom: path.join(__dirname, 'fixture/precompile-helpers')
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('generators support', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/generators.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('async/await support', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/async-await.js')])
		.then(result => {
			t.is(result.passCount, 2);
		});
});

test('test title prefixes — multiple files', t => {
	t.plan(5);

	const separator = ` ${figures.pointerSmall} `;
	const files = [
		path.join(__dirname, 'fixture/async-await.js'),
		path.join(__dirname, 'fixture/generators.js'),
		path.join(__dirname, 'fixture/subdir/in-a-subdir.js')
	];
	const expected = [
		['async-await', 'async function'].join(separator),
		['async-await', 'arrow async function'].join(separator),
		['generators', 'generator function'].join(separator),
		['subdir', 'in-a-subdir', 'subdir'].join(separator)
	];
	let index;

	const api = apiCreator();

	api.run(files)
		.then(() => {
			// If all lines were removed from expected output
			// actual output matches expected output
			t.is(expected.length, 0);
		});

	api.on('test-run', runStatus => {
		runStatus.on('test', a => {
			index = expected.indexOf(a.title);

			t.true(index >= 0);

			// Remove line from expected output
			expected.splice(index, 1);
		});
	});
});

test('test title prefixes — single file', t => {
	t.plan(2);

	const separator = ` ${figures.pointerSmall} `;
	const files = [
		path.join(__dirname, 'fixture/generators.js')
	];
	const expected = [
		['generator function'].join(separator)
	];
	let index;

	const api = apiCreator();

	api.run(files)
		.then(() => {
			// If all lines were removed from expected output
			// actual output matches expected output
			t.is(expected.length, 0);
		});

	api.on('test-run', runStatus => {
		runStatus.on('test', a => {
			index = expected.indexOf(a.title);

			t.true(index >= 0);

			// Remove line from expected output
			expected.splice(index, 1);
		});
	});
});

test('test title prefixes — single file (explicit)', t => {
	t.plan(2);

	const separator = ` ${figures.pointerSmall} `;
	const files = [
		path.join(__dirname, 'fixture/generators.js')
	];
	const expected = [
		['generators', 'generator function'].join(separator)
	];
	let index;

	const api = apiCreator({
		explicitTitles: true
	});

	api.run(files)
		.then(() => {
			// If all lines were removed from expected output
			// actual output matches expected output
			t.is(expected.length, 0);
		});

	api.on('test-run', runStatus => {
		runStatus.on('test', a => {
			index = expected.indexOf(a.title);

			t.true(index >= 0);

			// Remove line from expected output
			expected.splice(index, 1);
		});
	});
});

test('display filename prefixes for failed test stack traces', t => {
	const files = [
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/one-pass-one-fail.js')
	];

	const api = apiCreator();

	return api.run(files)
		.then(result => {
			t.is(result.passCount, 2);
			t.is(result.failCount, 1);
			t.match(result.errors[0].title, /one-pass-one-fail \S this is a failing test/);
		});
});

// This is a seperate test because we can't ensure the order of the errors (to match them), and this is easier than
// sorting.
test('display filename prefixes for failed test stack traces in subdirs', t => {
	const files = [
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/subdir/failing-subdir.js')
	];

	const api = apiCreator();

	return api.run(files)
		.then(result => {
			t.is(result.passCount, 1);
			t.is(result.failCount, 1);
			t.match(result.errors[0].title, /subdir \S failing-subdir \S subdir fail/);
		});
});

test('fail-fast mode - single file', t => {
	const api = apiCreator({
		failFast: true
	});

	const tests = [];

	api.on('test-run', runStatus => {
		runStatus.on('test', test => {
			tests.push({
				ok: !test.error,
				title: test.title
			});
		});
	});

	return api.run([path.join(__dirname, 'fixture/fail-fast/single-file/test.js')])
		.then(result => {
			t.ok(api.options.failFast);
			t.strictDeepEqual(tests, [{
				ok: true,
				title: 'first pass'
			}, {
				ok: false,
				title: 'second fail'
			}]);
			t.is(result.passCount, 1);
			t.is(result.failCount, 1);
		});
});

test('fail-fast mode - multiple files', t => {
	const api = apiCreator({
		failFast: true,
		serial: true
	});

	const tests = [];

	api.on('test-run', runStatus => {
		runStatus.on('test', test => {
			tests.push({
				ok: !test.error,
				title: test.title
			});
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
		path.join(__dirname, 'fixture/fail-fast/multiple-files/passes.js')
	])
		.then(result => {
			t.ok(api.options.failFast);
			t.strictDeepEqual(tests, [{
				ok: true,
				title: `fails ${figures.pointerSmall} first pass`
			}, {
				ok: false,
				title: `fails ${figures.pointerSmall} second fail`
			}]);
			t.is(result.passCount, 1);
			t.is(result.failCount, 1);
		});
});

test('fail-fast mode - crash', t => {
	const api = apiCreator({
		failFast: true,
		serial: true
	});

	const tests = [];
	const errors = [];

	api.on('test-run', runStatus => {
		runStatus.on('test', test => {
			tests.push({
				ok: !test.error,
				title: test.title
			});
		});
		runStatus.on('error', err => {
			errors.push(err);
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/fail-fast/crash/crashes.js'),
		path.join(__dirname, 'fixture/fail-fast/crash/passes.js')
	])
		.then(result => {
			t.ok(api.options.failFast);
			t.strictDeepEqual(tests, []);
			t.is(errors.length, 1);
			t.is(errors[0].name, 'AvaError');
			t.is(errors[0].message, `${path.join('test', 'fixture', 'fail-fast', 'crash', 'crashes.js')} exited with a non-zero exit code: 1`);
			t.is(result.passCount, 0);
			t.is(result.failCount, 0);
		});
});

test('fail-fast mode - timeout', t => {
	const api = apiCreator({
		failFast: true,
		serial: true,
		timeout: '100ms'
	});

	const tests = [];
	const errors = [];

	api.on('test-run', runStatus => {
		runStatus.on('test', test => {
			tests.push({
				ok: !test.error,
				title: test.title
			});
		});
		runStatus.on('error', err => {
			errors.push(err);
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/fail-fast/timeout/fails.js'),
		path.join(__dirname, 'fixture/fail-fast/timeout/passes.js')
	])
		.then(result => {
			t.ok(api.options.failFast);
			t.strictDeepEqual(tests, []);
			t.is(errors.length, 1);
			t.is(errors[0].name, 'AvaError');
			t.is(errors[0].message, 'Exited because no new tests completed within the last 100ms of inactivity');
			t.is(result.passCount, 0);
			t.is(result.failCount, 0);
		});
});

test('serial execution mode', t => {
	const api = apiCreator({
		serial: true
	});

	return api.run([path.join(__dirname, 'fixture/serial.js')])
		.then(result => {
			t.ok(api.options.serial);
			t.is(result.passCount, 3);
			t.is(result.failCount, 0);
		});
});

test('circular references on assertions do not break process.send', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/circular-reference-on-assertion.js')])
		.then(result => {
			t.is(result.failCount, 1);
		});
});

test('run from package.json folder by default', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/process-cwd-default.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('control worker\'s process.cwd() with projectDir option', t => {
	const fullPath = path.join(__dirname, 'fixture/process-cwd-pkgdir.js');
	const api = apiCreator({projectDir: path.dirname(fullPath)});

	return api.run([fullPath])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('unhandled promises will throw an error', t => {
	t.plan(3);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.is(data.name, 'Error');
			t.match(data.message, /You can't handle this!/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/loud-rejection.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('uncaught exception will throw an error', t => {
	t.plan(3);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.is(data.name, 'Error');
			t.match(data.message, /Can't catch me!/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/uncaught-exception.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('errors can occur without messages', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/error-without-message.js')])
		.then(result => {
			t.is(result.failCount, 1);
			t.is(result.errors.length, 1);
		});
});

test('stack traces for exceptions are corrected using a source map file', t => {
	t.plan(4);

	const api = apiCreator({
		cacheEnabled: true
	});

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.match(data.message, /Thrown by source-map-fixtures/);
			t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
			t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:4.*$/m);
		});
	});

	return api.run([path.join(__dirname, 'fixture/source-map-file.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map file in what looks like a browser env', t => {
	t.plan(4);

	const api = apiCreator({
		cacheEnabled: true
	});

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.match(data.message, /Thrown by source-map-fixtures/);
			t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
			t.match(data.stack, /^.*?Immediate\b.*source-map-file-browser-env.js:7.*$/m);
		});
	});

	return api.run([path.join(__dirname, 'fixture/source-map-file-browser-env.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('enhanced assertion formatting necessary whitespace and empty strings', t => {
	const expected = [
		[
			/foo === "" && "" === foo/,
			/foo === ""/,
			/foo/
		],
		[
			/new Object\(foo\) instanceof Object/,
			/Object/,
			/new Object\(foo\)/,
			/foo/
		],
		[
			/\[foo].filter\(item => {\n\s+return item === "bar";\n}\).length > 0/,
			/\[foo].filter\(item => {\n\s+return item === "bar";\n}\).length/,
			/\[foo].filter\(item => {\n\s+return item === "bar";\n}\)/,
			/\[foo]/,
			/foo/
		]
	];

	t.plan(14);
	const api = apiCreator();
	return api.run([path.join(__dirname, 'fixture/enhanced-assertion-formatting.js')])
		.then(result => {
			t.is(result.errors.length, 3);
			t.is(result.passCount, 0);

			result.errors.forEach((error, errorIndex) => {
				error.error.statements.forEach((statement, statementIndex) => {
					t.match(statement[0], expected[errorIndex][statementIndex]);
				});
			});
		});
});

test('stack traces for exceptions are corrected using a source map file (cache off)', t => {
	t.plan(4);

	const api = apiCreator({
		cacheEnabled: false
	});

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.match(data.message, /Thrown by source-map-fixtures/);
			t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
			t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:4.*$/m);
		});
	});

	return api.run([path.join(__dirname, 'fixture/source-map-file.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache on)', t => {
	t.plan(4);

	const api = apiCreator({
		cacheEnabled: true
	});

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.match(data.message, /Thrown by source-map-fixtures/);
			t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
			t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:14.*$/m);
		});
	});

	return api.run([path.join(__dirname, 'fixture/source-map-initial.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache off)', t => {
	t.plan(4);

	const api = apiCreator({
		cacheEnabled: false
	});

	api.on('test-run', runStatus => {
		runStatus.on('error', data => {
			t.match(data.message, /Thrown by source-map-fixtures/);
			t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
			t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:14.*$/m);
		});
	});

	return api.run([path.join(__dirname, 'fixture/source-map-initial.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('absolute paths', t => {
	const api = apiCreator();

	return api.run([path.resolve('test/fixture/es2015.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('symlink to directory containing test files', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/symlink')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('symlink to test file directly', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/symlinkfile.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('search directories recursively for files', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/subdir')])
		.then(result => {
			t.is(result.passCount, 2);
			t.is(result.failCount, 1);
		});
});

test('titles of both passing and failing tests and AssertionErrors are returned', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/one-pass-one-fail.js')])
		.then(result => {
			t.match(result.errors[0].title, /this is a failing test/);
			t.match(result.tests[0].title, /this is a passing test/);
			t.match(result.errors[0].error.name, /AssertionError/);
		});
});

test('empty test files cause an AvaError to be emitted', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /No tests found.*?import "ava"/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/empty.js')]);
});

test('test file with no tests causes an AvaError to be emitted', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /No tests/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/no-tests.js')]);
});

test('test file that immediately exits with 0 exit code', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Test results were not received from/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/immediate-0-exit.js')]);
});

test('test file that immediately exits with 3 exit code', t => {
	t.plan(3);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.is(err.file, path.join('test', 'fixture', 'immediate-3-exit.js'));
			t.match(err.message, /exited with a non-zero exit code: 3/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/immediate-3-exit.js')]);
});

test('testing nonexistent files causes an AvaError to be emitted', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Couldn't find any files to test/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/broken.js')]);
});

test('test file in node_modules is ignored', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Couldn't find any files to test/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/node_modules/test.js')]);
});

test('test file in fixtures is ignored', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Couldn't find any files to test/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/fixtures/test.js')]);
});

test('test file in helpers is ignored', t => {
	t.plan(2);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Couldn't find any files to test/);
		});
	});

	return api.run([path.join(__dirname, 'fixture/ignored-dirs/helpers/test.js')]);
});

test('Node.js-style --require CLI argument', t => {
	const requirePath = './' + path.relative('.', path.join(__dirname, 'fixture/install-global.js')).replace(/\\/g, '/');

	const api = apiCreator({
		require: [requirePath]
	});

	return api.run([path.join(__dirname, 'fixture/validate-installed-global.js')])
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('Node.js-style --require CLI argument module not found', t => {
	t.throws(() => {
		/* eslint no-new: 0 */
		apiCreator({require: ['foo-bar']});
	}, /^Could not resolve required module 'foo-bar'$/);
	t.end();
});

test('caching is enabled by default', t => {
	del.sync(path.join(__dirname, 'fixture/caching/node_modules'));

	const api = apiCreator({
		projectDir: path.join(__dirname, 'fixture/caching')
	});

	return api.run([path.join(__dirname, 'fixture/caching/test.js')])
		.then(() => {
			const files = fs.readdirSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava'));
			t.ok(files.length, 4);
			t.is(files.filter(x => endsWithBin(x)).length, 1);
			t.is(files.filter(x => endsWithJs(x)).length, 2);
			t.is(files.filter(x => endsWithMap(x)).length, 1);
		});

	function endsWithBin(filename) {
		return /\.bin$/.test(filename);
	}

	function endsWithJs(filename) {
		return /\.js$/.test(filename);
	}

	function endsWithMap(filename) {
		return /\.map$/.test(filename);
	}
});

test('caching can be disabled', t => {
	del.sync(path.join(__dirname, 'fixture/caching/node_modules'));

	const api = apiCreator({
		resolveTestsFrom: path.join(__dirname, 'fixture/caching'),
		cacheEnabled: false
	});

	return api.run([path.join(__dirname, 'fixture/caching/test.js')])
		.then(() => {
			t.false(fs.existsSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava')));
		});
});

test('test file with only skipped tests does not create a failure', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/skip-only.js')])
		.then(result => {
			t.is(result.tests.length, 1);
			t.true(result.tests[0].skip);
		});
});

test('test file with only skipped tests does not run hooks', t => {
	const api = apiCreator();

	return api.run([path.join(__dirname, 'fixture/hooks-skipped.js')])
		.then(result => {
			t.is(result.tests.length, 1);
			t.is(result.skipCount, 1);
			t.is(result.passCount, 0);
			t.is(result.failCount, 0);
		});
});

test('resets state before running', t => {
	const api = apiCreator();

	return api.run([path.resolve('test/fixture/es2015.js')]).then(result => {
		t.is(result.passCount, 1);
		return api.run([path.resolve('test/fixture/es2015.js')]);
	}).then(result => {
		t.is(result.passCount, 1);
	});
});

test('emits dependencies for test files', t => {
	t.plan(8);

	const api = apiCreator({
		require: [path.resolve('test/fixture/with-dependencies/require-custom.js')]
	});

	const testFiles = [
		path.normalize('test/fixture/with-dependencies/no-tests.js'),
		path.normalize('test/fixture/with-dependencies/test.js'),
		path.normalize('test/fixture/with-dependencies/test-failure.js'),
		path.normalize('test/fixture/with-dependencies/test-uncaught-exception.js')
	];

	const sourceFiles = [
		path.resolve('test/fixture/with-dependencies/dep-1.js'),
		path.resolve('test/fixture/with-dependencies/dep-2.js'),
		path.resolve('test/fixture/with-dependencies/dep-3.custom')
	];

	api.on('test-run', runStatus => {
		runStatus.on('dependencies', (file, dependencies) => {
			t.notEqual(testFiles.indexOf(file), -1);
			t.strictDeepEqual(dependencies.slice(-3), sourceFiles);
		});

		// The test files are designed to cause errors so ignore them here.
		runStatus.on('error', () => {});
	});

	const result = api.run(['test/fixture/with-dependencies/*test*.js']);

	return result.catch(() => {});
});

test('emits stats for test files', t => {
	t.plan(2);

	const api = apiCreator();
	api.on('test-run', runStatus => {
		runStatus.on('stats', stats => {
			if (stats.file === path.normalize('test/fixture/exclusive.js')) {
				t.is(stats.hasExclusive, true);
			} else if (stats.file === path.normalize('test/fixture/generators.js')) {
				t.is(stats.hasExclusive, false);
			} else {
				t.ok(false);
			}
		});
	});

	return api.run([
		'test/fixture/exclusive.js',
		'test/fixture/generators.js'
	]);
});

test('verify test count', t => {
	t.plan(8);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		t.is(runStatus.passCount, 0);
		t.is(runStatus.failCount, 0);
		t.is(runStatus.skipCount, 0);
		t.is(runStatus.todoCount, 0);
	});

	return api.run([
		path.join(__dirname, 'fixture/test-count.js'),
		path.join(__dirname, 'fixture/test-count-2.js'),
		path.join(__dirname, 'fixture/test-count-3.js')
	]).then(result => {
		t.is(result.passCount, 4, 'pass count');
		t.is(result.failCount, 3, 'fail count');
		t.is(result.skipCount, 3, 'skip count');
		t.is(result.todoCount, 3, 'todo count');
	});
});

test('babel.testOptions with a custom plugin', t => {
	t.plan(2);

	const api = apiCreator({
		babelConfig: {
			testOptions: {
				plugins: [testCapitalizerPlugin]
			}
		},
		cacheEnabled: false,
		projectDir: __dirname
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.is(data.title, 'FOO');
		});
	});

	return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
		.then(result => {
			t.is(result.passCount, 1);
		}, t.threw);
});

test('babel.testOptions.babelrc effectively defaults to true', t => {
	t.plan(3);

	const api = apiCreator({
		projectDir: path.join(__dirname, 'fixture/babelrc')
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.ok((data.title === 'foo') || (data.title === 'repeated test: foo'));
		});
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 2);
		});
});

test('babel.testOptions.babelrc can explicitly be true', t => {
	t.plan(3);

	const api = apiCreator({
		babelConfig: {
			testOptions: {babelrc: true}
		},
		cacheEnabled: false,
		projectDir: path.join(__dirname, 'fixture/babelrc')
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.ok(data.title === 'foo' || data.title === 'repeated test: foo');
		});
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 2);
		});
});

test('babel.testOptions.babelrc can explicitly be false', t => {
	t.plan(2);

	const api = apiCreator({
		babelConfig: {
			testOptions: {babelrc: false}
		},
		cacheEnabled: false,
		projectDir: path.join(__dirname, 'fixture/babelrc')
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.is(data.title, 'foo');
		});
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 1);
		});
});

test('babelConfig.testOptions merges plugins with .babelrc', t => {
	t.plan(3);

	const api = apiCreator({
		babelConfig: {
			testOptions: {
				babelrc: true,
				plugins: [testCapitalizerPlugin]
			}
		},
		cacheEnabled: false,
		projectDir: path.join(__dirname, 'fixture/babelrc')
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.ok(data.title === 'FOO' || data.title === 'repeated test: foo');
		});
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 2);
		});
});

test('babelConfig.testOptions with extends still merges plugins with .babelrc', t => {
	t.plan(3);

	const api = apiCreator({
		babelConfig: {
			testOptions: {
				plugins: [testCapitalizerPlugin],
				extends: path.join(__dirname, 'fixture/babelrc/.alt-babelrc')
			}
		},
		cacheEnabled: false,
		projectDir: path.join(__dirname, 'fixture/babelrc')
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.ok(data.title === 'BAR' || data.title === 'repeated test: bar');
		});
	});

	return api.run()
		.then(result => {
			t.is(result.passCount, 2);
		});
});

test('using --match with no matching tests causes an AvaError to be emitted', t => {
	t.plan(2);

	const api = apiCreator({
		match: ['can\'t match this']
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.fail(`Unexpected test run: ${data.title}`);
		});
		runStatus.on('error', err => {
			t.is(err.name, 'AvaError');
			t.match(err.message, /Couldn't find any matching tests/);
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/match-no-match.js'),
		path.join(__dirname, 'fixture/match-no-match-2.js'),
		path.join(__dirname, 'fixture/test-count.js')
	]);
});

test('using --match with matching tests will only report those passing tests', t => {
	t.plan(2);

	const api = apiCreator({
		match: ['this test will match']
	});

	api.on('test-run', runStatus => {
		runStatus.on('test', data => {
			t.match(data.title, /^match-no-match-2 .+ this test will match$/);
		});
		runStatus.on('error', err => {
			t.fail(`Unexpected failure: ${err}`);
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/match-no-match.js'),
		path.join(__dirname, 'fixture/match-no-match-2.js'),
		path.join(__dirname, 'fixture/test-count.js')
	]).then(result => {
		t.is(result.passCount, 1);
	}).catch(() => {
		t.fail();
	});
});

test('errors thrown when running files are emitted', t => {
	t.plan(3);

	const api = apiCreator();

	api.on('test-run', runStatus => {
		runStatus.on('error', err => {
			t.is(err.name, 'SyntaxError');
			t.is(err.file, path.join('test', 'fixture', 'syntax-error.js'));
			t.match(err.message, /Unexpected token/);
		});
	});

	return api.run([
		path.join(__dirname, 'fixture/es2015.js'),
		path.join(__dirname, 'fixture/syntax-error.js')
	]);
});

function generatePassDebugTests(execArgv, expectedInspectIndex) {
	test(`pass ${execArgv.join(' ')} to fork`, t => {
		const api = apiCreator({testOnlyExecArgv: execArgv});
		return api._computeForkExecArgv()
			.then(result => {
				t.true(result.length === execArgv.length);
				if (expectedInspectIndex === -1) {
					t.true(/--debug=\d+/.test(result[0]));
				} else {
					t.true(/--inspect=\d+/.test(result[expectedInspectIndex]));
				}
			});
	});
}

function generatePassDebugIntegrationTests(execArgv) {
	test(`pass ${execArgv.join(' ')} to fork`, t => {
		const api = apiCreator({testOnlyExecArgv: execArgv});
		return api.run([path.join(__dirname, 'fixture/debug-arg.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});
}

function generatePassInspectIntegrationTests(execArgv) {
	test(`pass ${execArgv.join(' ')} to fork`, t => {
		const api = apiCreator({testOnlyExecArgv: execArgv});
		return api.run([path.join(__dirname, 'fixture/inspect-arg.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});
}

generatePassDebugTests(['--debug=0'], -1);
generatePassDebugTests(['--debug'], -1);

generatePassDebugTests(['--inspect=0'], 0);
generatePassDebugTests(['--inspect'], 0);

// --inspect takes precedence
generatePassDebugTests(['--inspect=0', '--debug-brk'], 0);
generatePassDebugTests(['--inspect', '--debug-brk'], 0);

// --inspect takes precedence, though --debug-brk is still passed to the worker
generatePassDebugTests(['--debug-brk', '--inspect=0'], 1);
generatePassDebugTests(['--debug-brk', '--inspect'], 1);

if (Number(process.version.split('.')[0].slice(1)) < 8) {
	generatePassDebugIntegrationTests(['--debug=0']);
	generatePassDebugIntegrationTests(['--debug']);
} else {
	generatePassInspectIntegrationTests(['--inspect=9229']);
	generatePassInspectIntegrationTests(['--inspect']);
}
