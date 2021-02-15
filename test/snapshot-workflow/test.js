const test = require('@ava/test');

const exec = require('../helpers/exec');
const path = require('path');
const tempy = require('tempy');
const fs = require('fs').promises;
const fse = require('fs-extra');

async function withTemporaryFixture(t, fixture, implementation, ...args) {
	await tempy.directory.task(async temporaryDir => {
		await fse.copy(fixture, temporaryDir);
		await implementation(t, temporaryDir, ...args);
	});
}

function withConfigurableFixture(t, implementation, ...args) {
	return withTemporaryFixture(t, exec.cwd('configurable'), implementation, ...args);
}

async function beforeAndAfter(t, cwd, options, implementation, ...args) {
	const {
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

	const before = {
		result: await exec.fixture(beforeCli, {cwd, env: {...baseEnv, ...beforeEnv}}),
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

test('First run generates a .snap and a .md', withConfigurableFixture, async (t, cwd) => {
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};
	const config = [
		'--0.1.message="a message"',
		'--2.0.message="another message"'
	];

	await exec.fixture(['--', ...config], {cwd, env});

	await t.notThrowsAsync(fs.access(path.join(cwd, 'test.js.snap')));
	t.snapshot(await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8'), 'snapshot report');
});

test('Adding more snapshots to a test adds them to the .snap and .md', withConfigurableFixture, async (t, cwd) => {
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};

	await exec.fixture(['--', '--0.1.omit'], {cwd, env});
	const before = await readSnapshots(cwd);

	await exec.fixture([], {cwd, env});
	const after = await readSnapshots(cwd);

	t.notDeepEqual(after.snapshot, before.snapshot);
	t.not(after.report, before.report);
});

test('Adding a test with snapshots adds them to the .snap and .md', withConfigurableFixture, async (t, cwd) => {
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};

	await exec.fixture(['--', '--0.omit'], {cwd, env});
	const before = await readSnapshots(cwd);

	await exec.fixture([], {cwd, env});
	const after = await readSnapshots(cwd);

	t.notDeepEqual(after.snapshot, before.snapshot);
	t.not(after.report, before.report);
	t.snapshot(after.report, 'snapshot report after prepending a test');
});

test('Changing a snapshot\'s label does not change the .snap or .md', withConfigurableFixture, async (t, cwd) => {
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};

	await exec.fixture([], {cwd, env});
	const before = await readSnapshots(cwd);

	await exec.fixture(['--', '--0.0.message="a new message"'], {cwd, env});
	const after = await readSnapshots(cwd);

	t.deepEqual(after.snapshot, before.snapshot);
	t.is(after.report, before.report);
});

test(
	'With --update-snapshots, changing a snapshot\'s label updates the .snap and .md',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--update-snapshots', '--', '--0.0.message="a new message"']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after changing a label');
	}
);

test(
	'Changing a test\'s title adds a new block, puts the old block at the end',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--', '--0.title="a new title"']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after changing a title');
	}
);

test(
	'Reordering tests does not change the .snap or .md',
	withTemporaryFixture,
	exec.cwd('reorder'),
	beforeAndAfter,
	{
		before: {env: {TEMPLATE: true}}
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test(
	'With --update-snapshots, reordering tests reorders the .snap and .md',
	withTemporaryFixture,
	exec.cwd('reorder'),
	beforeAndAfter,
	{
		before: {env: {TEMPLATE: true}},
		after: {cli: ['--update-snapshots']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after reordering tests');
	}
);

test(
	'Removing a snapshot assertion retains its data',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--', '--0.1.omit']}
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test(
	'With --update-snapshots, removing a snapshot assertion removes its data',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--update-snapshots', '--', '--0.1.omit']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing a snapshot');
	}
);

test(
	'Removing all snapshots from a test retains its data',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--', '--0.0.omit', '--0.1.omit']}
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test(
	'With --update-snapshots, removing all snapshots from a test removes the block',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--update-snapshots', '--', '--0.0.omit', '--0.1.omit']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing all snapshots from \'foo\'');
	}
);

test(
	'Removing a test retains its data',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--', '--0.omit']}
	},
	async (t, {before, after}) => {
		t.deepEqual(after.snapshot, before.snapshot);
		t.is(after.report, before.report);
	}
);

test(
	'With --update-snapshots, removing a test removes its block',
	withConfigurableFixture,
	beforeAndAfter,
	{
		after: {cli: ['--update-snapshots', '--', '--0.omit']}
	},
	async (t, {before, after}) => {
		t.notDeepEqual(after.snapshot, before.snapshot);
		t.not(after.report, before.report);
		t.snapshot(after.report, 'snapshot report after removing test \'foo\'');
	}
);
