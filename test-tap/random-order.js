import {readFile, rm} from 'node:fs/promises';

import {test} from 'tap';

import {normalizeSeed} from '../lib/random-order.js';
import Runner from '../lib/runner.js';
import {set as setOptions} from '../lib/worker/options.js';

import {execCli} from './helper/cli.js';

setOptions({});

async function run(options = {}) {
	const order = [];
	const runner = new Runner({file: import.meta.url, ...options});
	const finish = runner.once('finish');
	for (const title of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
		runner.chain(title, t => {
			order.push(title);
			t.pass();
		});
	}

	runner.chain.serial('serial one', t => {
		order.push('serial one');
		t.pass();
	});
	runner.chain.serial('serial two', t => {
		order.push('serial two');
		t.pass();
	});
	await finish;
	return order;
}

test('seeded order is repeatable, changes with the seed, and preserves serial declarations', async t => {
	const first = await run({seed: 'first'});
	t.same(await run({seed: 'first'}), first);
	t.notSame(await run({seed: 'second'}), first);
	t.same(first.slice(0, 2), ['serial one', 'serial two']);
	t.notSame(first.slice(2), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
});

test('default order is unchanged', async t => {
	t.same(await run(), ['serial one', 'serial two', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
});

test('filtering retains the relative seeded order', async t => {
	const all = await run({seed: 'first'});
	t.same(await run({seed: 'first', match: ['a', 'c', 'e', 'g']}), all.filter(title => ['a', 'c', 'e', 'g'].includes(title)));
});

test('global serial mode still randomizes ordinary tests without reordering test.serial', async t => {
	t.same(await run({seed: 'first', serial: true}), await run({seed: 'first'}));
});

test('seed generation and validation', t => {
	t.equal(normalizeSeed({}), undefined);
	t.match(normalizeSeed({randomize: true}), /^[\da-f]{32}$/u);
	t.equal(normalizeSeed({seed: '0'}), '0');
	for (const seed of ['', 0, null, 'bad\nseed', '\u{1B}[31m']) {
		t.throws(() => normalizeSeed({seed}), TypeError);
	}

	t.throws(() => normalizeSeed({randomize: 'yes'}), TypeError);
	t.end();
});

const cli = (args, file = 'test.js', env = {}) => new Promise(resolve => {
	execCli([file, ...args], {dirname: 'fixture/random-order', env}, (error, stdout, stderr) => {
		resolve({
			error, stdout, stderr, order: `${stdout}\n${stderr}`.matchAll(/ORDER:([^\n\r]+)/gu).map(match => match[1]).toArray(),
		});
	});
});

test('CLI replay works in threads and processes, including TAP output', async t => {
	const threaded = await cli(['--seed=first', '--serial']);
	t.error(threaded.error, threaded.stderr);
	t.match(`${threaded.stdout}${threaded.stderr}`, /Random seed: first/u);
	t.same(threaded.order, await run({seed: 'first'}));
	const processRun = await cli(['--seed=first', '--serial', '--no-worker-threads', '--tap']);
	t.error(processRun.error, processRun.stderr);
	t.match(processRun.stdout, /# Random seed: first/u);
	t.same(processRun.order, threaded.order);
	const generated = await cli(['--randomize', '--serial']);
	t.error(generated.error, generated.stderr);
	const [, seed] = /Random seed: ([\da-f]{32})/u.exec(`${generated.stdout}${generated.stderr}`) ?? [];
	t.ok(seed);
	if (!seed) {
		return;
	}

	const replay = await cli([`--seed=${seed}`, '--serial']);
	t.error(replay.error, replay.stderr);
	t.same(replay.order, generated.order);
});

test('seeded CLI preserves snapshot identity, hooks, skipped tests and todos', async t => {
	const snapshot = new URL('fixture/random-order/snapshots.js.snap', import.meta.url);
	const report = new URL('fixture/random-order/snapshots.js.md', import.meta.url);
	t.teardown(async () => {
		await rm(snapshot, {force: true});
		await rm(report, {force: true});
	});
	const env = {AVA_FORCE_CI: 'not-ci'};
	const first = await cli(['--seed=first', '--update-snapshots'], 'snapshots.js', env);
	t.error(first.error, first.stderr);
	const before = await readFile(snapshot);
	const reportBefore = await readFile(report, 'utf8');
	const second = await cli(['--seed=second', '--update-snapshots'], 'snapshots.js', env);
	t.error(second.error, second.stderr);
	t.same(await readFile(snapshot), before);
	t.equal(await readFile(report, 'utf8'), reportBefore);
	const replay = await cli(['--seed=third', '--no-worker-threads'], 'snapshots.js', env);
	t.error(replay.error, replay.stderr);
});
