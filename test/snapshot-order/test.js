const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');

test('snapshot files are independent of test resolution order', async t => {
	// Run, updating snapshots.
	await exec.fixture(['intertest-order.js', '-u']);

	// Read the resulting file
	const snapshotPath = path.join(__dirname, 'fixtures', 'intertest-order.js.snap');
	const snapshot = fs.readFileSync(snapshotPath);

	// Run in reversed order, updating snapshots.
	await exec.fixture(['intertest-order.js', '-u'], {
		env: {
			INTERTEST_ORDER_REVERSE: 'true'
		}
	});

	// Read the resulting file
	const snapshotReversed = fs.readFileSync(snapshotPath);

	// Compare snapshots
	t.deepEqual(snapshot, snapshotReversed);
});
