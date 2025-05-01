import {test, withFixture} from './helpers/watch.js';

test('can filter test files by glob pattern', withFixture('filter-files'), async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a file filter to only run test1.test.js
			process.stdin.write('g\n');
			process.stdin.write('**/test1.*\n');
		},

		async 2({stats}) {
			// Only tests from test1 should run
			t.is(stats.selectedTestCount, 4);

			t.is(stats.passed.length, 3);
			for (const skipped of stats.passed) {
				t.regex(skipped.file, /test1\.test\.js/);
			}

			t.is(stats.failed.length, 1);
			for (const skipped of stats.failed) {
				t.regex(skipped.file, /test1\.test\.js/);
			}

			this.done();
		},
	});
});

test('can filter test files by glob pattern and have no tests run', withFixture('filter-files'), async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a file filter that doesn't match any files
			process.stdin.write('g\n');
			process.stdin.write('kangarookanbankentuckykendoll\n');

			process.send('abort-watcher');
			const {stdout} = await process;
			t.regex(stdout, /2 test files were found, but did not match the filters/);
			t.regex(stdout, /\* kangarookanbankentuckykendoll/);

			this.done();
		},
	});
});

test('when filtering by glob pattern, run all tests with \'a', withFixture('filter-files'), async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a file filter to only run test1.test.js
			process.stdin.write('g\n');
			process.stdin.write('**/test1.*\n');
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
});

test('can filter tests by title', withFixture('filter-files'), async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a title filter to only run bob from test1.test.js
			process.stdin.write('m\n');
			process.stdin.write('bob\n');
		},

		async 2({stats}) {
			// Only tests that match the test title should run
			t.is(stats.selectedTestCount, 1);
			t.is(stats.passed.length, 1);
			for (const ran of stats.passed) {
				t.regex(ran.title, /bob/);
			}

			this.done();
		},
	});
});

test('can filter tests title and have no tests run', withFixture('filter-files'),	async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a title filter that doesn't match any tests
			process.stdin.write('m\n');
			process.stdin.write('sirnotappearinginthisfilm\n');
		},

		async 2({process, stats}) {
			// No tests should run
			t.is(stats.selectedTestCount, 0);

			process.send('abort-watcher');
			const {stdout} = await process;
			t.regex(stdout, /Couldn’t find any matching tests/);

			this.done();
		},
	});
});

test('when filtering by title, run all tests with \'a', withFixture('filter-files'), async (t, fixture) => {
	await fixture.watch({
		async 1({process, stats}) {
			// First run should run all tests
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			// Set a file filter to only run bob from test1.test.js
			process.stdin.write('m\n');
			process.stdin.write('bob\n');
		},

		async 2({process, stats}) {
			t.is(stats.selectedTestCount, 1);

			process.stdin.write('a\n');
		},
		async 3({stats}) {
			t.is(stats.selectedTestCount, 8);
			t.is(stats.passed.length, 6);

			this.done();
		},
	});
});
