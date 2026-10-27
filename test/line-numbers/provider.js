import {pathToFileURL} from 'node:url';

import test from '@ava/test';

import {fixture, resolveFixtureDirectory} from '../helpers/exec.js';

const cwd = resolveFixtureDirectory('provider');
const env = {NODE_OPTIONS: `--import=${pathToFileURL(`${cwd}/_register-provider.js`)}`};

for (const workerThreads of [true, false]) {
	const args = workerThreads ? [] : ['--no-worker-threads'];

	test(`selects the original source line using a provider (workerThreads=${workerThreads})`, async t => {
		const result = await fixture([...args, 'source.ts:14'], {cwd, env});

		t.deepEqual(result.stats.passed, [{file: 'source.ts', title: 'target'}]);
		t.is(result.stats.selectedTestCount, 1);
	});
}

test('does not resolve compiled files without a line filter', async t => {
	const result = await fixture(['source.ts'], {cwd, env: {...env, RESOLVER_MUST_NOT_RUN: '1'}});

	t.is(result.stats.passed.length, 2);
});

test('does not resolve ordinary JavaScript files', async t => {
	const result = await fixture(['plain.js:3'], {cwd, env: {...env, RESOLVER_MUST_NOT_RUN: '1'}});

	t.deepEqual(result.stats.passed, [{file: 'plain.js', title: 'plain JavaScript'}]);
});

test('retains line selection for a provider without the resolver', async t => {
	const result = await fixture(['legacy.ts:3'], {cwd, env: {...env, PROVIDER_PROTOCOL: 'ava-8'}});

	t.deepEqual(result.stats.passed, [{file: 'legacy.ts', title: 'legacy provider'}]);
});

test('retains source parsing errors for a provider without the resolver', async t => {
	const result = await t.throwsAsync(fixture(['source.ts:14'], {cwd, env: {...env, PROVIDER_PROTOCOL: 'ava-8'}}));

	t.true(result.stdout.includes('for line number selection'));
	t.is(result.stats.selectedTestCount, 0);
	t.deepEqual(result.stats.uncaughtExceptions, []);
});

test('reports provider resolution errors as line selection errors', async t => {
	const result = await t.throwsAsync(fixture(['source.ts:14'], {cwd, env: {...env, RESOLVER_ERROR: '1'}}));

	t.true(result.stdout.includes('resolver failed'));
	t.is(result.stats.selectedTestCount, 0);
	t.deepEqual(result.stats.uncaughtExceptions, []);
});
