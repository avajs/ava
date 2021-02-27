const fs = require('fs').promises;
const exec = require('../../helpers/exec');
const path = require('path');
const tempy = require('tempy');
const fse = require('fs-extra');

async function withTemporaryFixture(t, cwd, implementation, ...args) {
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		await implementation(t, temporary, ...args);
	});
}

module.exports.withTemporaryFixture = withTemporaryFixture;

async function testSnapshotPruning(t, {
	cwd,
	env,
	cli,
	remove,
	snapshotPath = 'test.js.snap',
	reportPath = 'test.js.md',
	checkRun = async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
}) {
	snapshotPath = path.join(cwd, snapshotPath);
	reportPath = path.join(cwd, reportPath);

	t.teardown(async () => {
		try {
			await fs.unlink(snapshotPath);
			await fs.unlink(reportPath);
		} catch {}
	});

	// Execute fixture as template to generate snapshots
	const templateResult = exec.fixture(['--update-snapshots'], {
		cwd,
		env: {
			...env,
			AVA_FORCE_CI: 'not-ci',
			TEMPLATE: 'true'
		}
	});

	await t.notThrowsAsync(templateResult, 'Template crashed - there\'s a bug in the test');

	// Check that the snapshots were created
	await t.notThrowsAsync(fs.access(snapshotPath), 'Template didn\'t create a snapshot - there\'s a bug in the test');
	await t.notThrowsAsync(fs.access(reportPath), 'Template didn\'t create a report - there\'s a bug in the test');

	// Execute fixture as run
	const run = exec.fixture(cli, {
		cwd,
		env: {
			AVA_FORCE_CI: 'not-ci',
			...env
		}
	});

	await checkRun(t, run);

	if (remove) {
		// Assert files don't exist
		await t.throwsAsync(fs.access(snapshotPath), {code: 'ENOENT'}, 'Expected snapshot to be removed');
		await t.throwsAsync(fs.access(reportPath), {code: 'ENOENT'}, 'Expected report to be remove');
	} else {
		// Assert files exist
		await t.notThrowsAsync(fs.access(snapshotPath), 'Expected snapshot not to be removed');
		await t.notThrowsAsync(fs.access(reportPath), 'Expected report not to be removed');
	}
}

module.exports.testSnapshotPruning = testSnapshotPruning;
