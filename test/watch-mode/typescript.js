import fs from 'node:fs/promises';
import path from 'node:path';

import {test, withFixture} from './helpers/watch.js';

test('waits for external compiler before re-running typescript test files', withFixture('typescript-precompiled'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			t.true(stats.passed.length > 0);
			await this.assertIdle(async () => {
				await this.touch('src/test.ts');
			});
			await this.touch('build/test.js');
			return stats.passed;
		},
		async 2({stats}, previousPassed) {
			t.deepEqual(stats.passed, previousPassed);
			this.done();
		},
	});
});

test('does not run precompiled files when sources are deleted', withFixture('typescript-precompiled'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.rm('src/test.ts');
			});
			this.done();
		},
	});
});

test('handles deletion of precompiled and source files (multiple possible sources for precompiled file)', withFixture('typescript-precompiled'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.rm('src/test.ts');
				await this.rm('build/test.js');
			});
			this.done();
		},
	});
});

test('handles deletion of precompiled and source files (single possible source for precompiled file)', withFixture('typescript-precompiled'), async (t, fixture) => {
	await fixture.watch({
		async 1() {
			await this.assertIdle(async () => {
				await this.rm('src/test.ts');
				await this.rm('build/test.js');
			});
			this.done();
		},
	}, [], {env: {JUST_TS_EXTENSION: 'true'}});
});

test('handles inline compilation', withFixture('typescript-inline'), async (t, fixture) => {
	await fs.symlink(new URL('../../node_modules', import.meta.url), path.join(fixture.dir, 'node_modules'), 'junction');
	await fixture.watch({
		async 1({stats}) {
			t.true(stats.passed.length > 0);
			await this.touch('src/test.ts');
			return stats.passed;
		},
		async 2({stats}, previousPassed) {
			t.deepEqual(stats.passed, previousPassed);
			this.done();
		},
	});
});

test('ignores changes to compiled files with inline compilation', withFixture('typescript-inline'), async (t, fixture) => {
	await fs.symlink(new URL('../../node_modules', import.meta.url), path.join(fixture.dir, 'node_modules'), 'junction');
	await fixture.watch({
		async 1({stats}) {
			t.true(stats.passed.length > 0);
			await this.assertIdle(async () => {
				await this.touch('build/test.js');
			});
			this.done();
		},
	});
});
