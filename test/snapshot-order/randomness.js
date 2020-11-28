const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');
const getSnapshotIds = require('./helpers/get-snapshot-ids');

test('deterministic and sorted over a large, random test case', async t => {
	const options = {
		cwd: exec.cwd('randomness'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Run test
	await exec.fixture(['--update-snapshots'], options);

	// Assert snapshot is unchanged
	const snapshot = fs.readFileSync(snapshotPath);

	t.snapshot(snapshot);

	// Assert report is sorted
	const report = fs.readFileSync(reportPath);
	const ids = getSnapshotIds(report);

	t.deepEqual(ids, [...ids].sort((a, b) => a - b));
});
