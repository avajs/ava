import fs from 'node:fs/promises';

import test from '@ava/test';
import {temporaryFile} from 'tempy';

import {cleanOutput, cwd, fixture} from '../helpers/exec.js';

async function runWithSeed(seed) {
	const orderFile = temporaryFile();
	const result = await fixture([`--seed=${seed}`, '--concurrency=1'], {
		cwd: cwd('order'),
		env: {ORDER_FILE: orderFile},
	});
	const contents = await fs.readFile(orderFile, 'utf8');

	return {
		order: contents.trim().split('\n'),
		stdout: result.stdout,
	};
}

test('seeded runs use a reproducible randomized order', async t => {
	const first = await runWithSeed(1234);
	const second = await runWithSeed(1234);
	const third = await runWithSeed(9876);

	t.deepEqual(first.order, second.order);
	t.notDeepEqual(first.order, third.order);
	t.deepEqual(first.order.slice(0, 2), ['serial one', 'serial two']);
	t.true(first.stdout.includes('Random seed: 1234'));
});

test('bails when --seed is provided with invalid input', async t => {
	const result = await t.throwsAsync(fixture(['--seed=-1'], {cwd: cwd('order')}));

	t.is(cleanOutput(result.stderr), 'The --seed flag must be provided with a non-negative integer.');
});
