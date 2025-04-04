import {platform} from 'node:process';

import {test, withFixture} from './helpers/watch.js';

test('prints results and instructions', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async else({process}) {
			process.send('abort-watcher');
			const {stdout} = await process;
			t.regex(stdout, /\d+ tests? passed/);
			t.regex(
				stdout,
				/Type `p` and press enter to filter by a filename regex pattern/,
			);
			t.regex(
				stdout,
				/Type `t` and press enter to filter by a test name regex pattern/,
			);
			t.regex(stdout, /Type `r` and press enter to rerun tests/);
			t.regex(stdout, /Type `u` and press enter to update snapshots/);
			this.done();
		},
	});
});

test('ctrl+c interrupts', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async else({process}) {
			this.done();

			process.kill('SIGINT');
			const {stdout} = await t.throwsAsync(process);
			const result = await t.try(tt => {
				tt.regex(stdout, /Exiting due to SIGINT/);
			});
			if (platform === 'win32' && !result.passed) {
				result.discard();
				t.pass('Most likely on Windows we did not capture stdout when the process was killed');
			} else {
				result.commit();
			}
		},
	});
});

test('can rerun tests', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1(result) {
			result.process.stdin.write('r\n');
			const {selectedTestCount, passed} = result.stats;
			return {selectedTestCount, passed};
		},

		async 2(result, statsSubset) {
			result.process.stdin.write('R\n'); // Case-insensitive
			t.like(result.stats, statsSubset);
			return statsSubset;
		},

		async 3(result, statsSubset) {
			t.like(result.stats, statsSubset);
			this.done();
		},
	});
});

test('can update snapshots', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1({process}) {
			process.stdin.write('u\n');
			const {mtimeMs} = await this.stat('test.js.snap');
			return mtimeMs;
		},

		async 2({process}, previousMtimeMs) {
			process.stdin.write('U\n'); // Case-insensitive
			const {mtimeMs} = await this.stat('test.js.snap');
			t.true(mtimeMs > previousMtimeMs);
			return mtimeMs;
		},

		async 3(_, previousMtimeMs) {
			const {mtimeMs} = await this.stat('test.js.snap');
			t.true(mtimeMs > previousMtimeMs);
			this.done();
		},
	});
});

test(
	'can filter tests by filename pattern',
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
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 4);
				for (const skipped of stats.skipped) {
					t.notRegex(skipped.file, test1Regex);
				}

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
	'can filter tests by filename pattern and have no tests run',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'kangarookanbankentuckykendoll';
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
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 8);
				for (const skipped of stats.skipped) {
					t.notRegex(skipped.file, test1Regex);
				}

				this.done();
			},
		});
	},
);

test(
	'can filter tests by filename pattern, and run all tests with \'a',
	withFixture('filter-files'),
	async (t, fixture) => {
		const test1RegexString = 'kangarookanbankentuckykendoll';
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

			async 2({process, stats}) {
				// Only tests from test1 should run
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 8);
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

test(
	'can filter tests by test pattern',
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
				// Only tests from test1 should run
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 7);
				for (const skipped of stats.skipped) {
					t.notRegex(skipped.title, test1Regex);
				}

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
				// Only tests from test1 should run
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 8);
				for (const skipped of stats.skipped) {
					t.notRegex(skipped.title, test1Regex);
				}

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
				// Only tests from test1 should run
				t.is(stats.selectedTestCount, 8);
				t.is(stats.skipped.length, 8);
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
