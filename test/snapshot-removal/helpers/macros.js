const fs = require('fs').promises;
const exec = require('../../helpers/exec');
const path = require('path');
const tempy = require('tempy');
const fse = require('fs-extra');

const withTemporaryFixture = cwd => async (t, implementation, ...args) => {
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		await implementation(t, temporary, ...args);
	});
};

module.exports.withTemporaryFixture = withTemporaryFixture;

async function testSnapshotPruning(t, {
	cwd,
	env,
	cli,
	remove,
	snapshotFile = 'test.js.snap',
	reportFile = 'test.js.md',
	checkRun = async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
}) {
	const updating = process.argv.includes('--update-fixture-snapshots');

	if (updating) {
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
		const snapshotPath = path.join(cwd, snapshotFile);
		const reportPath = path.join(cwd, reportFile);
		await Promise.all([
			t.notThrowsAsync(fs.access(snapshotPath), 'Template didn\'t create a snapshot - there\'s a bug in the test'),
			t.notThrowsAsync(fs.access(reportPath), 'Template didn\'t create a report - there\'s a bug in the test')
		]);
	}

	// Make a temporary copy of the fixture
	await tempy.directory.task(async temporary => {
		await fse.copy(cwd, temporary);
		cwd = temporary;

		// Execute fixture as run
		const run = exec.fixture(cli, {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
				...env
			}
		});

		await checkRun(t, run);

		const snapshotPath = path.join(cwd, snapshotFile);
		const reportPath = path.join(cwd, reportFile);

		if (remove) { // eslint-disable-line unicorn/prefer-ternary
			// Assert files don't exist
			await Promise.all([
				t.throwsAsync(fs.access(snapshotPath), {code: 'ENOENT'}, 'Expected snapshot to be removed'),
				t.throwsAsync(fs.access(reportPath), {code: 'ENOENT'}, 'Expected report to be remove')
			]);
		} else {
			// Assert files exist
			await Promise.all([
				t.notThrowsAsync(fs.access(snapshotPath), 'Expected snapshot not to be removed'),
				t.notThrowsAsync(fs.access(reportPath), 'Expected report not to be removed')
			]);
		}
	});
}

module.exports.testSnapshotPruning = testSnapshotPruning;
