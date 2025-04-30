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
				/Type `p` and press enter to filter by a filepath regex pattern/,
			);
			t.regex(
				stdout,
				/Type `t` and press enter to filter by a test title regex pattern/,
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
