const exec = require('../../helpers/exec');
const path = require('path');
const fs = require('fs').promises;
const tempy = require('tempy');
const fse = require('fs-extra');

async function beforeAndAfter(t, {
	cwd,
	expectChanged,
	before: {
		env: beforeEnv = {},
		cli: beforeCli = []
	} = {},
	after: {
		env: afterEnv = {},
		cli: afterCli = []
	} = {}
}) {
	const baseEnv = {
		AVA_FORCE_CI: 'not-ci'
	};

	const updating = process.argv.includes('--update-fixture-snapshots');

	if (updating) {
		// Run template
		await exec.fixture(beforeCli, {cwd, env: {TEMPLATE: 'true', ...baseEnv, ...beforeEnv}});
	}

	const before = await readSnapshots(cwd);

	// Copy fixture to a temporary directory
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		cwd = temporary;

		// Run fixture
		await exec.fixture(afterCli, {cwd, env: {...baseEnv, ...afterEnv}});

		const after = await readSnapshots(cwd);

		if (expectChanged) {
			t.not(after.report, before.report, 'expected .md to be changed');
			t.notDeepEqual(after.snapshot, before.snapshot, 'expected .snap to be changed');
			t.snapshot(after.report, 'snapshot report');
		} else {
			t.is(after.report, before.report, 'expected .md to be unchanged');
			t.deepEqual(after.snapshot, before.snapshot, 'expected .snap to be unchanged');
		}
	});
}

exports.beforeAndAfter = beforeAndAfter;

async function readSnapshots(cwd) {
	const [snapshot, report] = await Promise.all([
		fs.readFile(path.join(cwd, 'test.js.snap')),
		fs.readFile(path.join(cwd, 'test.js.md'), 'utf8')
	]);
	return {snapshot, report};
}
