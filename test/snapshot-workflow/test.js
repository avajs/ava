const test = require('@ava/test');

const exec = require('../helpers/exec');
const path = require('path');
const fs = require('fs').promises;

async function beforeAndAfter(t, options, implementation, ...args) {
	const {
		cwd,
		before: {
			env: beforeEnv = {},
			cli: beforeCli = []
		} = {},
		after: {
			env: afterEnv = {},
			cli: afterCli = []
		} = {}
	} = options;

	const baseEnv = {
		AVA_FORCE_CI: 'not-ci'
	};

	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.md')));
	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.snap')));

	const before = {
		result: await exec.fixture(beforeCli, {cwd, env: {TEMPLATE: 'true', ...baseEnv, ...beforeEnv}}),
		...await readSnapshots(cwd)
	};

	const after = {
		result: await exec.fixture(afterCli, {cwd, env: {...baseEnv, ...afterEnv}}),
		...await readSnapshots(cwd)
	};

	await implementation(t, {before, after}, ...args);
}

async function readSnapshots(cwd) {
	return {
		snapshot: await fs.readFile(path.join(cwd, 'test.js.snap')),
		report: await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8')
	};
}

test('First run generates a .snap and a .md', async t => {
	const cwd = exec.cwd('first-run');
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};

	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.md')));
	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.snap')));

	await exec.fixture([], {cwd, env});

	await t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap')));
	const report = await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8');
	t.snapshot(report, 'snapshot report');
});

test(
	'Adding more snapshots to a test adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('adding-snapshots')
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshort report after adding snapshots');
	}
);

test(
	'Adding a test with snapshots adds them to the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('adding-test')
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after adding a test');
	}
);

test.serial(
	'Changing a snapshot\'s label does not change the .snap or .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-label')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, changing a snapshot\'s label updates the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-label'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after changing a label');
	}
);

test(
	'Changing a test\'s title adds a new block, puts the old block at the end',
	beforeAndAfter,
	{
		cwd: exec.cwd('changing-title'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after changing a title');
	}
);

test.serial(
	'Reordering tests does not change the .snap or .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('reorder')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, reordering tests reorders the .snap and .md',
	beforeAndAfter,
	{
		cwd: exec.cwd('reorder'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after reordering tests');
	}
);

test.serial(
	'Removing a snapshot assertion retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, removing a snapshot assertion removes its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-snapshots'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing a snapshot');
	}
);

test.serial(
	'Removing all snapshots from a test retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-all-snapshots')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, removing all snapshots from a test removes the block',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-all-snapshots'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing all snapshots from a test');
	}
);

test.serial(
	'Removing a test retains its data',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test')
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test.serial(
	'With --update-snapshots, removing a test removes its block',
	beforeAndAfter,
	{
		cwd: exec.cwd('removing-test'),
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing a test');
	}
);
