import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';

import getSnapshotIds from './helpers/get-snapshot-ids.js';

test('deterministic and sorted over a large, random test case', async t => {
	const options = {
		cwd: cwd('randomness'),
		env: {
			AVA_FORCE_CI: 'not-ci',
		},
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Run test
	await fixture(['--update-snapshots'], options);

	// Assert snapshot is unchanged
	const snapshot = fs.readFileSync(snapshotPath);

	t.snapshot(snapshot, 'resulting snapshot in binary encoding');

	// Assert report is sorted
	const report = fs.readFileSync(reportPath);
	const ids = getSnapshotIds(report);

	t.deepEqual(ids, [...ids].sort((a, b) => a - b));
});
