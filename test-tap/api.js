'use strict';
require('../lib/chalk').set();

const path = require('path');
const fs = require('fs');
const del = require('del');
const {test} = require('tap');
const Api = require('../lib/api');
const {normalizeGlobs} = require('../lib/globs');
const providerManager = require('../lib/provider-manager');

const ROOT_DIR = path.join(__dirname, '..');

function apiCreator(options = {}) {
	options.projectDir = options.projectDir || ROOT_DIR;
	if (options.babelConfig !== undefined) {
		options.providers = [{
			type: 'babel',
			main: providerManager.babel(options.projectDir).main({config: options.babelConfig})
		}];
	}

	options.chalkOptions = {level: 0};
	options.concurrency = 2;
	options.extensions = options.extensions || ['js'];
	options.experiments = {};
	options.globs = normalizeGlobs({files: options.files, ignoredByWatcher: options.ignoredByWatcher, extensions: options.extensions, providers: []});
	const instance = new Api(options);

	return instance;
}

const opts = [
	{workerThreads: true},
	{workerThreads: false}
];

for (const opt of opts) {
	test(`test.meta - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator({
			...opt,
			snapshotDir: 'snapshot-fixture'
		});
		return api.run({files: [path.join(__dirname, 'fixture', 'meta.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 3);
			});
	});

	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - single file & serial`, t => {
		const api = apiCreator({
			...opt,
			failFast: true
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						title: evt.title
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						title: evt.title
					});
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/fail-fast/single-file/test.js')]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictDeepEqual(tests, [{
					ok: true,
					title: 'first pass'
				}, {
					ok: false,
					title: 'second fail'
				}, {
					ok: true,
					title: 'third pass'
				}]);
				t.is(runStatus.stats.passedTests, 2);
				t.is(runStatus.stats.failedTests, 1);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - multiple files & serial`, t => {
		const api = apiCreator({
			...opt,
			failFast: true,
			serial: true
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						testFile: evt.testFile,
						title: evt.title
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						testFile: evt.testFile,
						title: evt.title
					});
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
			path.join(__dirname, 'fixture/fail-fast/multiple-files/passes.js')
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictDeepEqual(tests, [{
					ok: true,
					testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
					title: 'first pass'
				}, {
					ok: false,
					testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
					title: 'second fail'
				}]);
				t.is(runStatus.stats.passedTests, 1);
				t.is(runStatus.stats.failedTests, 1);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - multiple files & interrupt`, async t => {
		const api = apiCreator({
			...opt,
			failFast: true,
			concurrency: 2
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						testFile: evt.testFile,
						title: evt.title
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						testFile: evt.testFile,
						title: evt.title
					});
				}
			});
		});

		const fails = path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js');
		const passesSlow = path.join(__dirname, 'fixture/fail-fast/multiple-files/passes-slow.js');

		const runStatus = await api.run({files: [fails, passesSlow]});
		t.ok(api.options.failFast);
		t.ok(runStatus.stats.passedTests >= 2); // Results from passes-slow are not always received on Windows.
		t.ok(runStatus.stats.passedTests <= 3);
		t.is(runStatus.stats.failedTests, 1);

		t.strictDeepEqual(tests.filter(({testFile}) => testFile === fails), [{
			ok: true,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
			title: 'first pass'
		}, {
			ok: false,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
			title: 'second fail'
		}, {
			ok: true,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.js'),
			title: 'third pass'
		}]);
		if (runStatus.stats.passedTests === 3) {
			t.strictDeepEqual(tests.filter(({testFile}) => testFile === passesSlow), [{
				ok: true,
				testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/passes-slow.js'),
				title: 'first pass'
			}]);
		}
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - crash & serial`, t => {
		const api = apiCreator({
			...opt,
			failFast: true,
			serial: true
		});

		const tests = [];
		const workerFailures = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						title: evt.title
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						title: evt.title
					});
				} else if (evt.type === 'worker-failed') {
					workerFailures.push(evt);
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/crash/crashes.js'),
			path.join(__dirname, 'fixture/fail-fast/crash/passes.js')
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictDeepEqual(tests, []);
				t.is(workerFailures.length, 1);
				t.is(workerFailures[0].testFile, path.join(__dirname, 'fixture', 'fail-fast', 'crash', 'crashes.js'));
				t.is(runStatus.stats.passedTests, 0);
				t.is(runStatus.stats.failedTests, 0);
			});
	});

	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - timeout & serial`, t => {
		const api = apiCreator({
			...opt,
			failFast: true,
			serial: true,
			timeout: '100ms'
		});

		const tests = [];
		const timeouts = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						title: evt.title
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						title: evt.title
					});
				} else if (evt.type === 'timeout') {
					timeouts.push(evt);
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/timeout/fails.js'),
			path.join(__dirname, 'fixture/fail-fast/timeout/passes.js')
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictDeepEqual(tests, []);
				t.is(timeouts.length, 1);
				t.is(timeouts[0].period, 100);
				t.is(runStatus.stats.passedTests, 0);
				t.is(runStatus.stats.failedTests, 0);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - no errors`, t => {
		const api = apiCreator({
			...opt,
			failFast: true
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/without-error/a.js'),
			path.join(__dirname, 'fixture/fail-fast/without-error/b.js')
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.is(runStatus.stats.passedTests, 2);
				t.is(runStatus.stats.failedTests, 0);
			});
	});
	test(`serial execution mode - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator({
			...opt,
			serial: true
		});

		return api.run({files: [path.join(__dirname, 'fixture/serial.js')]})
			.then(runStatus => {
				t.ok(api.options.serial);
				t.is(runStatus.stats.passedTests, 3);
				t.is(runStatus.stats.failedTests, 0);
			});
	});
	test(`run from package.json folder by default - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/process-cwd-default.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`stack traces for exceptions are corrected using a source map file - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator({
			...opt,
			cacheEnabled: true
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'uncaught-exception') {
					t.match(evt.err.message, /Thrown by source-map-fixtures/);
					t.match(evt.err.stack, /^.*?\brun\b.*source-map-fixtures.src.throws.js:1.*$/m);
					t.match(evt.err.stack, /^.*?Immediate\b.*source-map-file.js:4.*$/m);
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/source-map-file.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`stack traces for exceptions are corrected using a source map file in what looks like a browser env - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator({
			...opt,
			cacheEnabled: true
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'uncaught-exception') {
					t.match(evt.err.message, /Thrown by source-map-fixtures/);
					t.match(evt.err.stack, /^.*?\brun\b.*source-map-fixtures.src.throws.js:1.*$/m);
					t.match(evt.err.stack, /^.*?Immediate\b.*source-map-file-browser-env.js:7.*$/m);
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/source-map-file-browser-env.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`enhanced assertion formatting necessary whitespace and empty strings - workerThreads: ${opt.workerThreads}`, t => {
		const expected = [
			[
				/foo === "" && "" === foo/,
				/foo === ""/,
				/foo/
			],
			[
				/!\(new Object\(foo\) instanceof Object\)/,
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

		t.plan(15);
		const api = apiCreator({
			...opt,
			files: ['test-tap/fixture/enhanced-assertion-formatting.js'],
			babelConfig: true
		});
		const errors = [];
		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					errors.push(evt.err);
				}
			});
		});
		return api.run({files: [path.join(__dirname, 'fixture/enhanced-assertion-formatting.js')]})
			.then(runStatus => {
				t.is(errors.length, 3);
				t.is(runStatus.stats.passedTests, 0);

				errors.forEach((error, errorIndex) => {
					error.statements.forEach((statement, statementIndex) => {
						t.match(statement[0], expected[errorIndex][statementIndex]);
					});
				});
			});
	});

	test(`stack traces for exceptions are corrected using a source map file (cache off) - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator({
			...opt,
			cacheEnabled: false
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'uncaught-exception') {
					t.match(evt.err.message, /Thrown by source-map-fixtures/);
					t.match(evt.err.stack, /^.*?\brun\b.*source-map-fixtures.src.throws.js:1.*$/m);
					t.match(evt.err.stack, /^.*?Immediate\b.*source-map-file.js:4.*$/m);
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/source-map-file.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache on) - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator({
			...opt,
			cacheEnabled: true
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'uncaught-exception') {
					t.match(evt.err.message, /Thrown by source-map-fixtures/);
					t.match(evt.err.stack, /^.*?\brun\b.*source-map-fixtures.src.throws.js:1.*$/m);
					t.match(evt.err.stack, /^.*?Immediate\b.*source-map-initial-input.js:14.*$/m);
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/source-map-initial.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`stack traces for exceptions are corrected using a source map, taking an initial source map for the test file into account (cache off) - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator({
			...opt,
			cacheEnabled: false
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'uncaught-exception') {
					t.match(evt.err.message, /Thrown by source-map-fixtures/);
					t.match(evt.err.stack, /^.*?\brun\b.*source-map-fixtures.src.throws.js:1.*$/m);
					t.match(evt.err.stack, /^.*?Immediate\b.*source-map-initial-input.js:14.*$/m);
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/source-map-initial.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`absolute paths - workerThreads:  ${opt.workerThreads}`, t => {
		const api = apiCreator(opt);

		return api.run({files: [path.resolve('test-tap/fixture/es2015.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`symlink to directory containing test files - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator({...opt, files: ['test-tap/fixture/symlink/*.js']});

		return api.run()
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`symlink to test file directly - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/symlinkfile.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`test file in node_modules is ignored - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(1);

		const api = apiCreator(opt);
		return api.run({files: [path.join(__dirname, 'fixture/ignored-dirs/node_modules/test.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.declaredTests, 0);
			});
	});

	test(`Node.js-style --require CLI argument - workerThreads: ${opt.workerThreads}`, t => {
		const requirePath = './' + path.relative('.', path.join(__dirname, 'fixture/install-global.js')).replace(/\\/g, '/');

		const api = apiCreator({
			...opt,
			require: [requirePath]
		});

		return api.run({files: [path.join(__dirname, 'fixture/validate-installed-global.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.passedTests, 1);
			});
	});

	test(`Node.js-style --require CLI argument module not found - workerThreads: ${opt.workerThreads}`, t => {
		t.throws(() => {
		/* eslint no-new: 0 */
			apiCreator({...opt, require: ['foo-bar']});
		}, /^Could not resolve required module ’foo-bar’$/);
		t.end();
	});

	test('caching is enabled by default - workerThreads: {opt.workerThreads}', t => {
		del.sync(path.join(__dirname, 'fixture/caching/node_modules'));

		const api = apiCreator({
			...opt,
			babelConfig: true,
			projectDir: path.join(__dirname, 'fixture/caching')
		});

		return api.run({files: [path.join(__dirname, 'fixture/caching/test.js')]})
			.then(() => {
				const files = fs.readdirSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava'));
				t.is(files.filter(x => x.endsWith('.js')).length, 1);
				t.is(files.filter(x => x.endsWith('.map')).length, 1);
				t.is(files.length, 2);
			});
	});

	test(`caching can be disabled - workerThreads: ${opt.workerThreads}`, t => {
		del.sync(path.join(__dirname, 'fixture/caching/node_modules'));

		const api = apiCreator({
			...opt,
			projectDir: path.join(__dirname, 'fixture/caching'),
			cacheEnabled: false
		});

		return api.run({files: [path.join(__dirname, 'fixture/caching/test.js')]})
			.then(() => {
				t.false(fs.existsSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava')));
			});
	});

	test(`test file with only skipped tests does not create a failure - workerThreads: ${opt.workerThreads}`, t => {
		const api = apiCreator();

		return api.run({...opt, files: [path.join(__dirname, 'fixture/skip-only.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.selectedTests, 1);
				t.is(runStatus.stats.skippedTests, 1);
				t.is(runStatus.stats.failedTests, 0);
			});
	});

	test(`test file with only skipped tests does not run hooks - workerThreads:  ${opt.workerThreads}`, t => {
		const api = apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/hooks-skipped.js')]})
			.then(runStatus => {
				t.is(runStatus.stats.selectedTests, 1);
				t.is(runStatus.stats.skippedTests, 1);
				t.is(runStatus.stats.passedTests, 0);
				t.is(runStatus.stats.failedTests, 0);
				t.is(runStatus.stats.failedHooks, 0);
			});
	});

	test(`emits dependencies for test files - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(8);

		const api = apiCreator({
			...opt,
			files: ['test-tap/fixture/with-dependencies/*test*.js'],
			require: [path.resolve('test-tap/fixture/with-dependencies/require-custom.js')]
		});

		const testFiles = new Set([
			path.resolve('test-tap/fixture/with-dependencies/no-tests.js'),
			path.resolve('test-tap/fixture/with-dependencies/test.js'),
			path.resolve('test-tap/fixture/with-dependencies/test-failure.js'),
			path.resolve('test-tap/fixture/with-dependencies/test-uncaught-exception.js')
		]);

		const sourceFiles = [
			path.resolve('test-tap/fixture/with-dependencies/dep-1.js'),
			path.resolve('test-tap/fixture/with-dependencies/dep-2.js'),
			path.resolve('test-tap/fixture/with-dependencies/dep-3.custom')
		];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'dependencies') {
					t.true(testFiles.has(evt.testFile));
					t.strictDeepEqual(evt.dependencies.slice(-3), sourceFiles);
				}
			});
		});

		return api.run();
	});

	test(`verify test count - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(4);

		const api = apiCreator(opt);

		return api.run({files: [
			path.join(__dirname, 'fixture/test-count.js'),
			path.join(__dirname, 'fixture/test-count-2.js'),
			path.join(__dirname, 'fixture/test-count-3.js')
		]}).then(runStatus => {
			t.is(runStatus.stats.passedTests, 4, 'pass count');
			t.is(runStatus.stats.failedTests, 3, 'fail count');
			t.is(runStatus.stats.skippedTests, 3, 'skip count');
			t.is(runStatus.stats.todoTests, 3, 'todo count');
		});
	});

	test(`using --match with matching tests will only report those passing tests - workerThreads: ${opt.workerThreads}`, t => {
		t.plan(3);

		const api = apiCreator({
			...opt,
			match: ['this test will match']
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'selected-test') {
					t.match(evt.testFile, /match-no-match-2/);
					t.is(evt.title, 'this test will match');
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/match-no-match.js'),
			path.join(__dirname, 'fixture/match-no-match-2.js'),
			path.join(__dirname, 'fixture/test-count.js')
		]}).then(runStatus => {
			t.is(runStatus.stats.passedTests, 1);
		});
	});
}

test('run from package.json folder by default', t => {
	const api = apiCreator({
		workerThreads: false
	});

	return api.run({files: [path.join(__dirname, 'fixture/process-cwd-default.js')]})
		.then(runStatus => {
			t.is(runStatus.stats.passedTests, 1);
		});
});
