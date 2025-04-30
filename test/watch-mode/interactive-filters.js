import {test, withFixture} from './helpers/watch.js';

test(
	'can filter tests by filepath pattern',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'test1';
		const test1Regex = new RegExp(test1RegexString);
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('p\n');
				process.stdin.write(`${test1RegexString}\n`);

				return stats;
			},

			async 2({stats}) {
				// Only tests from test1 should run
				t.is(stats.selectedTestCount, 4);

				t.is(stats.passed.length, 3);
				for (const skipped of stats.passed) {
					t.regex(skipped.file, test1Regex);
				}

				t.is(stats.failed.length, 1);
				for (const skipped of stats.failed) {
					t.regex(skipped.file, test1Regex);
				}

				this.done();
			},
		});
	},
);

test(
	'can filter tests by filepath pattern and have no tests run',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'kangarookanbankentuckykendoll';
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('p\n');
				process.stdin.write(`${test1RegexString}\n`);

				process.send('abort-watcher');
				const {stdout} = await process;
				t.regex(stdout, /2 test files were found, but did not match the CLI arguments/);
				this.done();

				return stats;
			},
		});
	},
);

test(
	'can filter tests by filepath pattern, and run all tests with \'a',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'test1';
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('p\n');
				process.stdin.write(`${test1RegexString}\n`);
				return stats;
			},

			async 2({process, stats}) {
				t.is(stats.selectedTestCount, 4);

				process.stdin.write('a\n');
			},
			async 3({stats}) {
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				this.done();
			},
		});
	},
);

test(
	'can filter tests by test title pattern',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'bob';
		const test1Regex = new RegExp(test1RegexString);
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('t\n');
				process.stdin.write(`${test1RegexString}\n`);
				return stats;
			},

			async 2({stats}) {
				// Only tests that match the test title should run
				t.is(stats.selectedTestCount, 1);
				t.is(stats.passed.length, 1);
				for (const skipped of stats.passed) {
					t.regex(skipped.title, test1Regex);
				}

				this.done();
			},
		});
	},
);

test(
	'can filter tests by test pattern and have no tests run',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'sirnotappearinginthisfilm';
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('t\n');
				process.stdin.write(`${test1RegexString}\n`);
				return stats;
			},

			async 2({stats}) {
				// No tests should run
				t.is(stats.selectedTestCount, 0);
				this.done();
			},
		});
	},
);

test(
	'can filter tests by test pattern, and run all tests with \'a',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'sirnotappearinginthisfilm';
		const test1Regex = new RegExp(test1RegexString);
		await fixture.watch({
			async 1({process, stats}) {
				// First run should run all tests
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				// Set a file filter to only run test1.js
				process.stdin.write('t\n');
				process.stdin.write(`${test1RegexString}\n`);
				return stats;
			},

			async 2({process, stats}) {
				t.is(stats.selectedTestCount, 0);
				for (const skipped of stats.skipped) {
					t.notRegex(skipped.file, test1Regex);
				}

				process.stdin.write('a\n');
			},
			async 3({stats}) {
				// All tests should run
				t.is(stats.selectedTestCount, 8);
				t.is(stats.passed.length, 6);

				this.done();
			},
		});
	},
);
