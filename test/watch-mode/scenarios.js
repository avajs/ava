import {test, withFixture} from './helpers/watch.js';

test('waits for changes', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle();
			this.done();
		},
	});
});

test('watcher can be configured to ignore files', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.touch('ignored-by-watcher.js');
			});
			this.done();
		},
	});
});

test('new, empty directories are ignored', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.mkdir('empty-directory');
			});
			this.done();
		},
	});
});

test('runs test files that depend on the changed file', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.touch('source.js');
		},
		async 2({stats}) {
			t.deepEqual(stats.passed, [{file: 'source.test.js', title: 'source'}]);
			this.done();
		},
	});
});

test('runs all test files if a file is changed that is not depended on', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			await this.touch('not-depended-on.js');
			return stats.passed;
		},
		async 2({stats}, previousPassed) {
			t.deepEqual(stats.passed, previousPassed);
			this.done();
		},
	});
});

test('runs all test files if a new file is added', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			await this.write('new-file.js');
			return stats.passed;
		},
		async 2({stats}, previousPassed) {
			t.deepEqual(stats.passed, previousPassed);
			this.done();
		},
	});
});

test('does not run deleted test file, even if source it previously depended on is changed', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.rm('source.test.js');
				await this.touch('source.js');
			});
			this.done();
		},
	});
});

test('runs test file when source it depends on is deleted', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.rm('source.js');
		},
		async 2({stats}) {
			t.is(stats.passed.length, 0);
			t.is(stats.uncaughtExceptions.length, 1);
			t.regex(stats.uncaughtExceptions[0].message, /Cannot find module.+source\.js.+imported from.+source\.test\.js/);
			this.done();
		},
	});
});

test('once test files containing .only() tests are encountered, always run those, but exclusively the .only tests', withFixture('exclusive'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			t.is(stats.failed.length, 2);
			t.is(stats.passed.length, 3);
			const contents = await this.read('a.test.js');
			await this.write('a.test.js', contents.replace('test(\'pass', 'test.only(\'pass'));
			return stats.passed.filter(({file}) => file !== 'c.test.js');
		},
		async 2({stats}, passed) {
			t.is(stats.failed.length, 0);
			t.is(stats.passed.length, 2);
			t.deepEqual(stats.passed, passed);
			this.done();
		},
	});
});

test('filters test files', withFixture('basic'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			t.false(stats.passed.some(({file}) => file === 'test.js'));
			await this.assertIdle(async () => {
				await this.touch('test.js');
			});
			this.done();
		},
	}, ['source.test.js']);
});
