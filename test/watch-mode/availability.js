import {fileURLToPath} from 'node:url';

import test from 'ava';

import {available} from '../../lib/watcher.js';

import {withFixture} from './helpers/watch.js';

if (available(fileURLToPath(import.meta.url))) {
	test('when available, watch mode works', withFixture('basic'), async (t, fixture) => {
		await fixture.watch({
			async 1(result) {
				t.true(result.stats.passed.length > 0);
				await this.touch(result.stats.passed[0].file);
			},

			else(result) {
				t.true(result.stats.passed.length > 0);
				this.done();
			},
		});
	});
} else {
	test('an error is printed when unavailable', withFixture('basic'), async (t, fixture) => {
		const result = await t.throwsAsync(fixture.run().next());
		t.true(result.stderr.trim().includes('Watch mode requires support for recursive fs.watch()'));
	});
}
