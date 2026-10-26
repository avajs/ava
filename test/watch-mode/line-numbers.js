import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {serial, withFixture} from './helpers/watch.js';

serial('preserves line selection when files change and interactive filters are applied', withFixture('line-numbers'), async (t, fixture) => {
	await fixture.watch({
		async 1({stats}) {
			t.deepEqual(stats.uncaughtExceptions, []);
			t.deepEqual(stats.passed, [{file: 'test.js', title: 'selected'}]);
			const source = await this.read('test.js');
			await this.write('test.js', source.replace('selected', 'updated selected'));
		},

		async 2({process, stats}) {
			t.deepEqual(stats.passed, [{file: 'test.js', title: 'updated selected'}]);
			process.stdin.write('g\n');
			process.stdin.write('*.js\n');
		},

		async 3({process, stats}) {
			t.deepEqual(stats.passed, [{file: 'test.js', title: 'updated selected'}]);
			process.stdin.write('r\n');
		},

		async 4({stats}) {
			t.deepEqual(stats.passed, [{file: 'test.js', title: 'updated selected'}]);
			this.done();
		},
	}, ['test.js:5']);
});

for (const workerThreads of [true, false]) {
	serial(`preserves provider source-line selection when compiled files change (workerThreads=${workerThreads})`, withFixture('../../line-numbers/fixtures/provider'), async (t, fixture) => {
		const env = {NODE_OPTIONS: `--import=${pathToFileURL(path.join(fixture.dir, '_register-provider.js'))}`};
		const args = workerThreads ? [] : ['--no-worker-threads'];
		await fixture.watch({
			async 1({stats}) {
				t.deepEqual(stats.uncaughtExceptions, []);
				t.deepEqual(stats.passed, [{file: 'source.ts', title: 'target'}]);
				const compiled = await this.read('compiled/source.js');
				await this.write('compiled/source.js', compiled.replace('target', 'updated target'));
			},

			async 2({stats}) {
				t.deepEqual(stats.passed, [{file: 'source.ts', title: 'updated target'}]);
				this.done();
			},
		}, [...args, 'source.ts:14'], {env});
	});
}
