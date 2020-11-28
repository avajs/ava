const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');

test('snapshot files are independent of test resolution order', async t => {
	const options = {
		cwd: exec.cwd('intertest-order'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(path.join(options.cwd, 'test.js.md'));
	});

	// Run, updating snapshots.
	await exec.fixture(['test.js', '--update-snapshots'], options);

	// Read the resulting file
	const snapshot = fs.readFileSync(snapshotPath);

	// Run in reversed order, updating snapshots.
	await exec.fixture(['test.js', '--update-snapshots'], {
		...options,
		env: {
			INTERTEST_ORDER_REVERSE: 'true',
			...options.env
		}
	});

	// Read the resulting file
	const snapshotReversed = fs.readFileSync(snapshotPath);

	// Compare snapshots
	t.deepEqual(snapshot, snapshotReversed);
});
