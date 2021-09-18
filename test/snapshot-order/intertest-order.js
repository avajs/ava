import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';

test('snapshot files are independent of test resolution order', async t => {
	const options = {
		cwd: cwd('intertest-order'),
		env: {
			AVA_FORCE_CI: 'not-ci',
		},
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(path.join(options.cwd, 'test.js.md'));
	});

	// Run, updating snapshots.
	await fixture(['test.js', '--update-snapshots'], options);

	// Read the resulting file
	const snapshot = fs.readFileSync(snapshotPath);

	// Run in reversed order, updating snapshots.
	await fixture(['test.js', '--update-snapshots'], {
		...options,
		env: {
			INTERTEST_ORDER_REVERSE: 'true',
			...options.env,
		},
	});

	// Read the resulting file
	const snapshotReversed = fs.readFileSync(snapshotPath);

	// Compare snapshots
	t.deepEqual(snapshot, snapshotReversed);
});
