import test from '@ava/test';

import {shuffleFiles} from '../../lib/random-order.js';
import {cleanOutput, fixture} from '../helpers/exec.js';

const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js'];

const runOrder = async args => {
	const {stdout} = await fixture(['--concurrency=1', ...args, ...files]);
	return [...stdout.matchAll(/([a-e]) › \1 passes/g)].map(([, file]) => file);
};

test('the same seed yields the same order', t => {
	t.deepEqual(shuffleFiles(files, 42), shuffleFiles(files, 42));
});

test('different seeds yield different orders', t => {
	const orders = new Set(Array.from({length: 20}, (_, seed) => shuffleFiles(files, seed).join(',')));
	t.true(orders.size > 1);
});

test('shuffling retains all files', t => {
	t.deepEqual(shuffleFiles(files, 42).toSorted(), files);
});

test('test files run in the seeded order', async t => {
	const expected = shuffleFiles(files, 42).map(file => file.replace('.js', ''));

	t.deepEqual(await runOrder(['--seed=42']), expected);
	t.deepEqual(await runOrder(['--seed=42']), expected);
});

test('different seeds run test files in different orders', async t => {
	const orders = new Set();
	for (const seed of [0, 1, 2, 3, 4, 5]) {
		const order = await runOrder([`--seed=${seed}`]); // eslint-disable-line no-await-in-loop
		orders.add(order.join(','));
	}

	t.true(orders.size > 1);
});

test('--randomize prints the seed so the order can be reproduced', async t => {
	const {stdout} = await fixture(['--randomize', ...files]);
	const [, seed] = /Reproduce with --seed=(\d+)/.exec(stdout) ?? [];

	t.truthy(seed);
	t.deepEqual(await runOrder([`--seed=${seed}`]), shuffleFiles(files, Number(seed)).map(file => file.replace('.js', '')));
});

test('the TAP reporter prints the seed', async t => {
	const {stdout} = await fixture(['--tap', '--seed=42', ...files]);

	t.true(stdout.includes('# Test files ran in a random order. Reproduce with --seed=42'));
});

test('test files run in source order without --randomize', async t => {
	t.deepEqual(await runOrder([]), ['a', 'b', 'c', 'd', 'e']);
});

test('bails when --seed is not an integer', async t => {
	const result = await t.throwsAsync(fixture(['--seed=foo', ...files]));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when --seed is negative', async t => {
	const result = await t.throwsAsync(fixture(['--seed=-1', ...files]));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when --seed is combined with --no-randomize', async t => {
	const result = await t.throwsAsync(fixture(['--no-randomize', '--seed=42', ...files]));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});

test('bails when randomizing while sortTestFiles is configured', async t => {
	const result = await t.throwsAsync(fixture(['--config', 'sort-test-files.js', '--randomize', ...files]));

	t.snapshot(cleanOutput(result.stderr), 'fails with message');
});
