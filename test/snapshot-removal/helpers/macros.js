import {promises as fs} from 'node:fs';
import path from 'node:path';

import {fixture} from '../../helpers/exec.js';
import {withTemporaryFixture} from '../../helpers/with-temporary-fixture.js';

export async function testSnapshotPruning(t, {
	cwd,
	env,
	cli,
	remove,
	snapshotFile = 'test.js.snap',
	reportFile = 'test.js.md',
	checkRun = async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	},
}) {
	const updating = process.argv.includes('--update-fixture-snapshots');

	if (updating) {
		// Execute fixture as template to generate snapshots
		const templateResult = fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
				TEMPLATE: 'true',
			},
		});

		await t.notThrowsAsync(templateResult, 'Template crashed - there\'s a bug in the test');

		// Check that the snapshots were created
		const snapshotPath = path.join(cwd, snapshotFile);
		const reportPath = path.join(cwd, reportFile);
		await Promise.all([
			t.notThrowsAsync(fs.access(snapshotPath), 'Template didn\'t create a snapshot - there\'s a bug in the test'),
			t.notThrowsAsync(fs.access(reportPath), 'Template didn\'t create a report - there\'s a bug in the test'),
		]);
	}

	// Make a temporary copy of the fixture
	await withTemporaryFixture(cwd, async cwd => {
		// Execute fixture as run
		const run = fixture(cli, {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
				...env,
			},
		});

		await checkRun(t, run);

		const snapshotPath = path.join(cwd, snapshotFile);
		const reportPath = path.join(cwd, reportFile);

		if (remove) {
			// Assert files don't exist
			await Promise.all([
				t.throwsAsync(fs.access(snapshotPath), {code: 'ENOENT'}, 'Expected snapshot to be removed'),
				t.throwsAsync(fs.access(reportPath), {code: 'ENOENT'}, 'Expected report to be remove'),
			]);
		} else {
			// Assert files exist
			await Promise.all([
				t.notThrowsAsync(fs.access(snapshotPath), 'Expected snapshot not to be removed'),
				t.notThrowsAsync(fs.access(reportPath), 'Expected report not to be removed'),
			]);
		}
	});
}
