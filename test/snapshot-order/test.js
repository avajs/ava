const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');

test('snapshot files are independent of test resolution order', async t => {
	const options = {
		cwd: exec.cwd('intertest-order')
	};
	// Run, updating snapshots.
	await exec.fixture(['test.js', '-u'], options);

	// Read the resulting file
	const snapshotPath = path.join(__dirname, 'fixtures', 'intertest-order', 'test.js.snap');
	const snapshot = fs.readFileSync(snapshotPath);

	// Run in reversed order, updating snapshots.
	await exec.fixture(['test.js', '-u'], {
		env: {
			INTERTEST_ORDER_REVERSE: 'true'
		},
		...options
	});

	// Read the resulting file
	const snapshotReversed = fs.readFileSync(snapshotPath);

	// Compare snapshots
	t.deepEqual(snapshot, snapshotReversed);
});
