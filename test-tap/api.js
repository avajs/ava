import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import ciInfo from 'ci-info';
import {test} from 'tap';

import Api from '../lib/api.js';
import {normalizeGlobs} from '../lib/globs.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

async function apiCreator(options = {}) {
	options.projectDir = options.projectDir || ROOT_DIR;
	options.chalkOptions = {level: 0};
	options.concurrency = 2;
	options.extensions = options.extensions || ['cjs'];
	options.experiments = {};
	options.globs = normalizeGlobs({files: options.files, ignoredByWatcher: options.ignoredByWatcher, extensions: options.extensions, providers: []});
	const instance = new Api(options);

	return instance;
}

const options = [
	{workerThreads: true},
	{workerThreads: false},
];

for (const opt of options) {
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - single file & serial`, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						title: evt.title,
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						title: evt.title,
					});
				}
			});
		});

		return api.run({files: [path.join(__dirname, 'fixture/fail-fast/single-file/test.cjs')]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictSame(tests, [{
					ok: true,
					title: 'first pass',
				}, {
					ok: false,
					title: 'second fail',
				}, {
					ok: true,
					title: 'third pass',
				}]);
				t.equal(runStatus.stats.passedTests, 2);
				t.equal(runStatus.stats.failedTests, 1);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - multiple files & serial`, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
			serial: true,
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						testFile: evt.testFile,
						title: evt.title,
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						testFile: evt.testFile,
						title: evt.title,
					});
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
			path.join(__dirname, 'fixture/fail-fast/multiple-files/passes.cjs'),
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictSame(tests, [{
					ok: true,
					testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
					title: 'first pass',
				}, {
					ok: false,
					testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
					title: 'second fail',
				}]);
				t.equal(runStatus.stats.passedTests, 1);
				t.equal(runStatus.stats.failedTests, 1);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - multiple files & interrupt`, {skip: ciInfo.isCI}, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
			concurrency: 2,
		});

		const tests = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'test-failed') {
					tests.push({
						ok: false,
						testFile: evt.testFile,
						title: evt.title,
					});
				} else if (evt.type === 'test-passed') {
					tests.push({
						ok: true,
						testFile: evt.testFile,
						title: evt.title,
					});
				}
			});
		});

		const fails = path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs');
		const passesSlow = path.join(__dirname, 'fixture/fail-fast/multiple-files/passes-slow.cjs');

		const runStatus = await api.run({files: [fails, passesSlow]});
		t.ok(api.options.failFast);
		t.ok(runStatus.stats.passedTests >= 2); // Results from passes-slow are not always received on Windows.
		t.ok(runStatus.stats.passedTests <= 3);
		t.equal(runStatus.stats.failedTests, 1);

		t.strictSame(tests.filter(({testFile}) => testFile === fails), [{
			ok: true,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
			title: 'first pass',
		}, {
			ok: false,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
			title: 'second fail',
		}, {
			ok: true,
			testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/fails.cjs'),
			title: 'third pass',
		}]);
		if (runStatus.stats.passedTests === 3) {
			t.strictSame(tests.filter(({testFile}) => testFile === passesSlow), [{
				ok: true,
				testFile: path.join(__dirname, 'fixture/fail-fast/multiple-files/passes-slow.cjs'),
				title: 'first pass',
			}]);
		}
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - crash & serial`, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
			serial: true,
		});

		const tests = [];
		const workerFailures = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				switch (evt.type) {
					case 'test-failed': {
						tests.push({
							ok: false,
							title: evt.title,
						});

						break;
					}

					case 'test-passed': {
						tests.push({
							ok: true,
							title: evt.title,
						});

						break;
					}

					case 'worker-failed': {
						workerFailures.push(evt);

						break;
					}
				// No default
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/crash/crashes.cjs'),
			path.join(__dirname, 'fixture/fail-fast/crash/passes.cjs'),
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictSame(tests, []);
				t.equal(workerFailures.length, 1);
				t.equal(workerFailures[0].testFile, path.join(__dirname, 'fixture', 'fail-fast', 'crash', 'crashes.cjs'));
				t.equal(runStatus.stats.passedTests, 0);
				t.equal(runStatus.stats.failedTests, 0);
			});
	});

	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - timeout & serial`, {skip: ciInfo.isCI}, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
			serial: true,
			timeout: '100ms',
		});

		const tests = [];
		const timeouts = [];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				switch (evt.type) {
					case 'test-failed': {
						tests.push({
							ok: false,
							title: evt.title,
						});

						break;
					}

					case 'test-passed': {
						tests.push({
							ok: true,
							title: evt.title,
						});

						break;
					}

					case 'timeout': {
						timeouts.push(evt);

						break;
					}
				// No default
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/timeout/fails.cjs'),
			path.join(__dirname, 'fixture/fail-fast/timeout/passes.cjs'),
			path.join(__dirname, 'fixture/fail-fast/timeout/passes-slow.cjs'),
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.strictSame(tests, []);
				t.equal(timeouts.length, 1);
				t.equal(timeouts[0].period, 100);
				t.equal(runStatus.stats.passedTests, 0);
				t.equal(runStatus.stats.failedTests, 0);
			});
	});
	test(`fail-fast mode - workerThreads: ${opt.workerThreads} - no errors`, async t => {
		const api = await apiCreator({
			...opt,
			failFast: true,
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/fail-fast/without-error/a.cjs'),
			path.join(__dirname, 'fixture/fail-fast/without-error/b.cjs'),
		]})
			.then(runStatus => {
				t.ok(api.options.failFast);
				t.equal(runStatus.stats.passedTests, 2);
				t.equal(runStatus.stats.failedTests, 0);
			});
	});
	test(`serial execution mode - workerThreads: ${opt.workerThreads}`, async t => {
		const api = await apiCreator({
			...opt,
			serial: true,
		});

		return api.run({files: [path.join(__dirname, 'fixture/serial.cjs')]})
			.then(runStatus => {
				t.ok(api.options.serial);
				t.equal(runStatus.stats.passedTests, 3);
				t.equal(runStatus.stats.failedTests, 0);
			});
	});
	test(`run from package.json folder by default - workerThreads: ${opt.workerThreads}`, async t => {
		const api = await apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/process-cwd-default.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.passedTests, 1);
			});
	});

	test(`absolute paths - workerThreads:  ${opt.workerThreads}`, async t => {
		const api = await apiCreator(opt);

		return api.run({files: [path.resolve('test-tap/fixture/es2015.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.passedTests, 1);
			});
	});

	test(`symlink to directory containing test files - workerThreads: ${opt.workerThreads}`, async t => {
		const api = await apiCreator({...opt, files: ['test-tap/fixture/symlink/*.cjs']});

		return api.run()
			.then(runStatus => {
				t.equal(runStatus.stats.passedTests, 1);
			});
	});

	test(`symlink to test file directly - workerThreads: ${opt.workerThreads}`, async t => {
		const api = await apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/symlinkfile.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.passedTests, 1);
			});
	});

	test(`test file in node_modules is ignored - workerThreads: ${opt.workerThreads}`, async t => {
		t.plan(1);

		const api = await apiCreator(opt);
		return api.run({files: [path.join(__dirname, 'fixture/ignored-dirs/node_modules/test.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.declaredTests, 0);
			});
	});

	test(`Node.js-style --require CLI argument - workerThreads: ${opt.workerThreads}`, async t => {
		const requirePath = './' + path.relative('.', path.join(__dirname, 'fixture/install-global.cjs')).replace(/\\/g, '/');

		const api = await apiCreator({
			...opt,
			require: [requirePath],
		});

		return api.run({files: [path.join(__dirname, 'fixture/validate-installed-global.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.passedTests, 1);
			});
	});

	test(`Node.js-style --require CLI argument module not found - workerThreads: ${opt.workerThreads}`, t => {
		t.rejects(apiCreator({...opt, require: ['foo-bar']}), /^Could not resolve required module ’foo-bar’$/);
		t.end();
	});

	test(`caching is enabled by default - workerThreads: ${opt.workerThreads}`, async t => {
		fs.rmSync(path.join(__dirname, 'fixture/caching/node_modules'), {recursive: true, force: true});

		const api = await apiCreator({
			...opt,
			projectDir: path.join(__dirname, 'fixture/caching'),
		});

		return api.run({files: [path.join(__dirname, 'fixture/caching/test.cjs')]})
			.then(() => {
				const files = fs.readdirSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava'));
				if (files.length === 1) {
					// This file may be written locally, but not in CI.
					t.equal(files.filter(x => x.startsWith('failing-tests.json')).length, 1);
				} else {
					t.equal(files.length, 0);
				}
			});
	});

	test(`caching can be disabled - workerThreads: ${opt.workerThreads}`, async t => {
		fs.rmSync(path.join(__dirname, 'fixture/caching/node_modules'), {recursive: true, force: true});

		const api = await apiCreator({
			...opt,
			projectDir: path.join(__dirname, 'fixture/caching'),
			cacheEnabled: false,
		});

		return api.run({files: [path.join(__dirname, 'fixture/caching/test.cjs')]})
			.then(() => {
				t.notOk(fs.existsSync(path.join(__dirname, 'fixture/caching/node_modules/.cache/ava')));
			});
	});

	test(`test file with only skipped tests does not create a failure - workerThreads: ${opt.workerThreads}`, async t => {
		const api = await apiCreator();

		return api.run({...opt, files: [path.join(__dirname, 'fixture/skip-only.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.selectedTests, 1);
				t.equal(runStatus.stats.skippedTests, 1);
				t.equal(runStatus.stats.failedTests, 0);
			});
	});

	test(`test file with only skipped tests does not run hooks - workerThreads:  ${opt.workerThreads}`, async t => {
		const api = await apiCreator(opt);

		return api.run({files: [path.join(__dirname, 'fixture/hooks-skipped.cjs')]})
			.then(runStatus => {
				t.equal(runStatus.stats.selectedTests, 1);
				t.equal(runStatus.stats.skippedTests, 1);
				t.equal(runStatus.stats.passedTests, 0);
				t.equal(runStatus.stats.failedTests, 0);
				t.equal(runStatus.stats.failedHooks, 0);
			});
	});

	test(`emits dependencies for test files - workerThreads: ${opt.workerThreads}`, async t => {
		t.plan(8);

		const api = await apiCreator({
			...opt,
			files: ['test-tap/fixture/with-dependencies/*test*.cjs'],
			require: [path.resolve('test-tap/fixture/with-dependencies/require-custom.cjs')],
		});

		const testFiles = new Set([
			path.resolve('test-tap/fixture/with-dependencies/no-tests.cjs'),
			path.resolve('test-tap/fixture/with-dependencies/test.cjs'),
			path.resolve('test-tap/fixture/with-dependencies/test-failure.cjs'),
			path.resolve('test-tap/fixture/with-dependencies/test-uncaught-exception.cjs'),
		]);

		const sourceFiles = [
			path.resolve('test-tap/fixture/with-dependencies/dep-1.js'),
			path.resolve('test-tap/fixture/with-dependencies/dep-2.js'),
			path.resolve('test-tap/fixture/with-dependencies/dep-3.custom'),
		];

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'dependencies') {
					t.ok(testFiles.has(evt.testFile));
					t.strictSame(evt.dependencies.filter(dep => !dep.endsWith('.snap')).slice(-3), sourceFiles);
				}
			});
		});

		return api.run();
	});

	test(`verify test count - workerThreads: ${opt.workerThreads}`, async t => {
		t.plan(4);

		const api = await apiCreator(opt);

		return api.run({files: [
			path.join(__dirname, 'fixture/test-count.cjs'),
			path.join(__dirname, 'fixture/test-count-2.cjs'),
			path.join(__dirname, 'fixture/test-count-3.cjs'),
		]}).then(runStatus => {
			t.equal(runStatus.stats.passedTests, 4, 'pass count');
			t.equal(runStatus.stats.failedTests, 3, 'fail count');
			t.equal(runStatus.stats.skippedTests, 3, 'skip count');
			t.equal(runStatus.stats.todoTests, 3, 'todo count');
		});
	});

	test(`using --match with matching tests will only report those passing tests - workerThreads: ${opt.workerThreads}`, async t => {
		t.plan(3);

		const api = await apiCreator({
			...opt,
			match: ['this test will match'],
		});

		api.on('run', plan => {
			plan.status.on('stateChange', evt => {
				if (evt.type === 'selected-test') {
					t.match(evt.testFile, /match-no-match-2/);
					t.equal(evt.title, 'this test will match');
				}
			});
		});

		return api.run({files: [
			path.join(__dirname, 'fixture/match-no-match.cjs'),
			path.join(__dirname, 'fixture/match-no-match-2.cjs'),
			path.join(__dirname, 'fixture/test-count.cjs'),
		]}).then(runStatus => {
			t.equal(runStatus.stats.passedTests, 1);
		});
	});
}

test('run from package.json folder by default', async t => {
	const api = await apiCreator({
		workerThreads: false,
	});

	return api.run({files: [path.join(__dirname, 'fixture/process-cwd-default.cjs')]})
		.then(runStatus => {
			t.equal(runStatus.stats.passedTests, 1);
		});
});
