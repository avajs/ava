'use strict';
const path = require('path');
const fs = require('fs');
const figures = require('figures');
const rimraf = require('rimraf');
const test = require('tap').test;
const pkgConf = require('pkg-conf');
const Api = require('../api');
const testCapitalizerPlugin = require('./fixture/babel-plugin-test-capitalizer');

const conf = pkgConf.sync('ava');
const pkgDir = path.dirname(pkgConf.filepath(conf));

generateTests('Without Pool: ', options => {
	options = options || {};
	options.powerAssert = true;
	options.pkgDir = options.pkgDir || pkgDir;
	return new Api(options);
});

// The following two tests are only run against "Without Pool" behavior as they test the exclusive test features. These features are currently not expected to work correctly in the limited process pool. When the limited process pool behavior is finalized this test file will be updated. See: https://github.com/avajs/ava/pull/791#issuecomment-216293302
test('Without Pool: test file with exclusive tests causes non-exclusive tests in other files to be ignored', t => {
	t.plan(4);

	const files = [
		path.join(__dirname, 'fixture/exclusive.js'),
		path.join(__dirname, 'fixture/exclusive-nonexclusive.js'),
		path.join(__dirname, 'fixture/one-pass-one-fail.js')
	];

	const api = new Api();

	return api.run(files)
		.then(result => {
			t.ok(result.hasExclusive);
			t.is(result.testCount, 5);
			t.is(result.passCount, 2);
			t.is(result.failCount, 0);
		});
});

test('Without Pool: test files can be forced to run in exclusive mode', t => {
	t.plan(4);

	const api = new Api();
	return api.run(
		[path.join(__dirname, 'fixture/es2015.js')],
		{runOnlyExclusive: true}
	).then(result => {
		t.ok(result.hasExclusive);
		t.is(result.testCount, 1);
		t.is(result.passCount, 0);
		t.is(result.failCount, 0);
	});
});

generateTests('With Pool: ', options => {
	options = options || {};
	options.concurrency = 2;
	options.powerAssert = true;
	options.pkgDir = options.pkgDir || pkgDir;
	return new Api(options);
});

function generateTests(prefix, apiCreator) {
	test(`${prefix} ES2015 support`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/es2015.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} precompile helpers`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/precompile-helpers/test/test.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} generators support`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/generators.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} async/await support`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/async-await.js')])
			.then(result => {
				t.is(result.passCount, 2);
			});
	});

	test(`${prefix} test title prefixes — multiple files`, t => {
		t.plan(6);

		const separator = ` ${figures.pointerSmall} `;
		const files = [
			path.join(__dirname, 'fixture/async-await.js'),
			path.join(__dirname, 'fixture/es2015.js'),
			path.join(__dirname, 'fixture/generators.js'),
			path.join(__dirname, 'fixture/subdir/in-a-subdir.js')
		];
		const expected = [
			['async-await', 'async function'].join(separator),
			['async-await', 'arrow async function'].join(separator),
			['es2015', '[anonymous]'].join(separator),
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

	test(`${prefix} test title prefixes — single file`, t => {
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

	test(`${prefix} test title prefixes — single file (explicit)`, t => {
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

	test(`${prefix} display filename prefixes for failed test stack traces`, t => {
		t.plan(3);

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
	test(`${prefix} display filename prefixes for failed test stack traces in subdirs`, t => {
		t.plan(3);

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

	test(`${prefix} fail-fast mode`, t => {
		t.plan(5);

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

		return api.run([path.join(__dirname, 'fixture/fail-fast.js')])
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
				t.match(result.errors[0].error.message, /Test failed via t.fail()/);
			});
	});

	test(`${prefix} serial execution mode`, t => {
		t.plan(3);

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

	test(`${prefix} circular references on assertions do not break process.send`, t => {
		t.plan(2);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/circular-reference-on-assertion.js')])
			.then(result => {
				t.is(result.failCount, 1);
				t.match(result.errors[0].error.message, /'c'.*?'d'/);
			});
	});

	test(`${prefix} run from package.json folder by default`, t => {
		t.plan(1);
		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/process-cwd-default.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} change process.cwd() to a test's directory with pkgDir`, t => {
		t.plan(1);

		const fullPath = path.join(__dirname, 'fixture/process-cwd-pkgdir.js');
		const api = apiCreator({pkgDir: path.dirname(fullPath)});

		return api.run([fullPath])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} unhandled promises will throw an error`, t => {
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

	test(`${prefix} uncaught exception will throw an error`, t => {
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

	test(`${prefix} errors can occur without messages`, t => {
		t.plan(2);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/error-without-message.js')])
			.then(result => {
				t.is(result.failCount, 1);
				t.is(result.errors.length, 1);
			});
	});

	test(`${prefix} stack traces for exceptions are corrected using a source map file`, t => {
		t.plan(4);

		const api = apiCreator({
			cacheEnabled: true
		});

		api.on('test-run', runStatus => {
			runStatus.on('error', data => {
				t.match(data.message, /Thrown by source-map-fixtures/);
				t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
				t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:11.*$/m);
			});
		});

		return api.run([path.join(__dirname, 'fixture/source-map-file.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} stack traces for exceptions are corrected using a source map file in what looks like a browser env`, t => {
		t.plan(4);

		const api = apiCreator({
			cacheEnabled: true
		});

		api.on('test-run', runStatus => {
			runStatus.on('error', data => {
				t.match(data.message, /Thrown by source-map-fixtures/);
				t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
				t.match(data.stack, /^.*?Immediate\b.*source-map-file-browser-env.js:14.*$/m);
			});
		});

		return api.run([path.join(__dirname, 'fixture/source-map-file-browser-env.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} stack traces for exceptions are corrected using a source map file (cache off)`, t => {
		t.plan(4);

		const api = apiCreator({
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('error', data => {
				t.match(data.message, /Thrown by source-map-fixtures/);
				t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
				t.match(data.stack, /^.*?Immediate\b.*source-map-file.js:11.*$/m);
			});
		});

		return api.run([path.join(__dirname, 'fixture/source-map-file.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache on)`, t => {
		t.plan(4);

		const api = apiCreator({
			cacheEnabled: true
		});

		api.on('test-run', runStatus => {
			runStatus.on('error', data => {
				t.match(data.message, /Thrown by source-map-fixtures/);
				t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
				t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:7.*$/m);
			});
		});

		return api.run([path.join(__dirname, 'fixture/source-map-initial.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache off)`, t => {
		t.plan(4);

		const api = apiCreator({
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('error', data => {
				t.match(data.message, /Thrown by source-map-fixtures/);
				t.match(data.stack, /^.*?Object\.t.*?as run\b.*source-map-fixtures.src.throws.js:1.*$/m);
				t.match(data.stack, /^.*?Immediate\b.*source-map-initial-input.js:7.*$/m);
			});
		});

		return api.run([path.join(__dirname, 'fixture/source-map-initial.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} absolute paths`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.resolve('test/fixture/es2015.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} symlink to directory containing test files`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/symlink')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} symlink to test file directly`, t => {
		t.plan(1);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/symlinkfile.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} search directories recursively for files`, t => {
		t.plan(2);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/subdir')])
			.then(result => {
				t.is(result.passCount, 2);
				t.is(result.failCount, 1);
			});
	});

	test(`${prefix} titles of both passing and failing tests and AssertionErrors are returned`, t => {
		t.plan(3);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/one-pass-one-fail.js')])
			.then(result => {
				t.match(result.errors[0].title, /this is a failing test/);
				t.match(result.tests[0].title, /this is a passing test/);
				t.match(result.errors[0].error.name, /AssertionError/);
			});
	});

	test(`${prefix} empty test files cause an AvaError to be emitted`, t => {
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

	test(`${prefix} test file with no tests causes an AvaError to be emitted`, t => {
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

	test(`${prefix} test file that immediately exits with 0 exit code`, t => {
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

	test(`${prefix} test file that immediately exits with 3 exit code`, t => {
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

	test(`${prefix} testing nonexistent files causes an AvaError to be emitted`, t => {
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

	test(`${prefix} test file in node_modules is ignored`, t => {
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

	test(`${prefix} test file in fixtures is ignored`, t => {
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

	test(`${prefix} test file in helpers is ignored`, t => {
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

	test(`${prefix} Node.js-style --require CLI argument`, t => {
		t.plan(1);

		const requirePath = './' + path.relative('.', path.join(__dirname, 'fixture/install-global.js')).replace(/\\/g, '/');

		const api = apiCreator({
			require: [requirePath]
		});

		return api.run([path.join(__dirname, 'fixture/validate-installed-global.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} Node.js-style --require CLI argument module not found`, t => {
		t.plan(1);

		t.throws(() => {
			/* eslint no-new: 0 */
			apiCreator({require: ['foo-bar']});
		}, /^Could not resolve required module 'foo-bar'$/);
	});

	test(`${prefix} power-assert support`, t => {
		t.plan(4);

		const api = apiCreator({
			babelConfig: {
				presets: ['react', 'es2015-node4', 'stage-2']
			}
		});

		return api.run([path.join(__dirname, 'fixture/power-assert.js')])
			.then(result => {
				t.match(
					result.errors[0].error.message,
					/t\.true\(a === 'bar'\)\s*\n\s+\|\s*\n\s+"foo"/m
				);

				t.match(
					result.errors[1].error.message,
					/with message\s+t\.true\(a === 'foo', 'with message'\)\s*\n\s+\|\s*\n\s+"bar"/m
				);

				t.match(
					result.errors[2].error.message,
					/t\.true\(o === \{ ...o \}\)\s*\n\s+\|\s*\n\s+Object\{\}/m
				);

				t.match(
					result.errors[3].error.message,
					/t\.true\(<div \/> === <span \/>\)/m
				);
			});
	});

	test(`${prefix} caching is enabled by default`, t => {
		t.plan(3);
		rimraf.sync(path.join(__dirname, 'fixture/caching/node_modules'));

		const api = apiCreator({
			resolveTestsFrom: path.join(__dirname, 'fixture/caching')
		});

		return api.run([path.join(__dirname, 'fixture/caching/test.js')])
			.then(() => {
				const files = fs.readdirSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava'));
				t.is(files.length, 2);
				t.is(files.filter(endsWithJs).length, 1);
				t.is(files.filter(endsWithMap).length, 1);
				t.end();
			});

		function endsWithJs(filename) {
			return /\.js$/.test(filename);
		}

		function endsWithMap(filename) {
			return /\.map$/.test(filename);
		}
	});

	test(`${prefix} caching can be disabled`, t => {
		t.plan(1);
		rimraf.sync(path.join(__dirname, 'fixture/caching/node_modules'));

		const api = apiCreator({
			resolveTestsFrom: path.join(__dirname, 'fixture/caching'),
			cacheEnabled: false
		});

		return api.run([path.join(__dirname, 'fixture/caching/test.js')])
			.then(() => {
				t.false(fs.existsSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava')));
				t.end();
			});
	});

	test(`${prefix} test file with only skipped tests does not create a failure`, t => {
		t.plan(2);

		const api = apiCreator();

		return api.run([path.join(__dirname, 'fixture/skip-only.js')])
			.then(result => {
				t.is(result.tests.length, 1);
				t.true(result.tests[0].skip);
			});
	});

	test(`${prefix} resets state before running`, t => {
		t.plan(2);

		const api = apiCreator();

		return api.run([path.resolve('test/fixture/es2015.js')]).then(result => {
			t.is(result.passCount, 1);
			return api.run([path.resolve('test/fixture/es2015.js')]);
		}).then(result => {
			t.is(result.passCount, 1);
		});
	});

	test(`${prefix} emits dependencies for test files`, t => {
		t.plan(8);

		const api = new Api({
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

	test(`${prefix} emits stats for test files`, t => {
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

	test(`${prefix} verify test count`, t => {
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

	test(`${prefix} Custom Babel Plugin Support`, t => {
		t.plan(2);

		const api = apiCreator({
			babelConfig: {
				presets: ['es2015-node4', 'stage-2'],
				plugins: [testCapitalizerPlugin]
			},
			cacheEnabled: false
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

	test(`${prefix} Default babel config doesn't use .babelrc`, t => {
		t.plan(2);

		const api = apiCreator();

		api.on('test-run', runStatus => {
			runStatus.on('test', data => {
				t.is(data.title, 'foo');
			});
		});

		return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} babelConfig:"inherit" uses .babelrc`, t => {
		t.plan(3);

		const api = apiCreator({
			babelConfig: 'inherit',
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('test', data => {
				t.ok((data.title === 'foo') || (data.title === 'repeated test: foo'));
			});
		});

		return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
			.then(result => {
				t.is(result.passCount, 2);
			});
	});

	test(`${prefix} babelConfig:{babelrc:true} uses .babelrc`, t => {
		t.plan(3);

		const api = apiCreator({
			babelConfig: {babelrc: true},
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('test', data => {
				t.ok((data.title === 'foo') || (data.title === 'repeated test: foo'));
			});
		});

		return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
			.then(result => {
				t.is(result.passCount, 2);
			});
	});

	test(`${prefix} babelConfig:{babelrc:true, plugins:[...]} merges plugins with .babelrc`, t => {
		t.plan(3);

		const api = apiCreator({
			babelConfig: {
				plugins: [testCapitalizerPlugin],
				babelrc: true
			},
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('test', data => {
				t.ok((data.title === 'FOO') || /^repeated test:/.test(data.title));
			});
		});

		return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
			.then(result => {
				t.is(result.passCount, 2);
			});
	});

	test(`${prefix} babelConfig:{extends:path, plugins:[...]} merges plugins with .babelrc`, t => {
		t.plan(2);

		const api = new Api({
			babelConfig: {
				plugins: [testCapitalizerPlugin],
				extends: path.join(__dirname, 'fixture/babelrc/.alt-babelrc')
			},
			cacheEnabled: false
		});

		api.on('test-run', runStatus => {
			runStatus.on('test', data => {
				t.is(data.title, 'BAR');
			});
		});

		return api.run([path.join(__dirname, 'fixture/babelrc/test.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});

	test(`${prefix} using --match with no matching tests causes an AvaError to be emitted`, t => {
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

	test(`${prefix} using --match with matching tests will only report those passing tests`, t => {
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

	test(`${prefix} errors thrown when running files are emitted`, t => {
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
}

function generatePassDebugTests(execArgv, expectedInspectIndex) {
	test(`pass ${execArgv.join(' ')} to fork`, t => {
		t.plan(expectedInspectIndex === -1 ? 3 : 2);

		const api = new Api({testOnlyExecArgv: execArgv});
		return api._computeForkExecArgs(['foo.js'])
			.then(result => {
				t.true(result.length === 1);
				if (expectedInspectIndex === -1) {
					t.true(result[0].length === 1);
					t.true(/--debug=\d+/.test(result[0][0]));
				} else {
					t.true(/--inspect=\d+/.test(result[0][expectedInspectIndex]));
				}
			});
	});
}

function generatePassDebugIntegrationTests(execArgv) {
	test(`pass ${execArgv.join(' ')} to fork`, t => {
		t.plan(1);

		const api = new Api({testOnlyExecArgv: execArgv});
		return api.run([path.join(__dirname, 'fixture/debug-arg.js')])
			.then(result => {
				t.is(result.passCount, 1);
			});
	});
}

generatePassDebugTests(['--debug=0'], -1);
generatePassDebugTests(['--debug'], -1);

generatePassDebugTests(['--inspect=0'], 0);
generatePassDebugTests(['--inspect'], 0);

generatePassDebugTests(['--inspect=0', '--debug-brk'], 0);
generatePassDebugTests(['--inspect', '--debug-brk'], 0);

generatePassDebugTests(['--debug-brk', '--inspect=0'], 1);
generatePassDebugTests(['--debug-brk', '--inspect'], 1);

// --inspect cannot be tested because released node doesn't support it
generatePassDebugIntegrationTests(['--debug=0']);
generatePassDebugIntegrationTests(['--debug']);
