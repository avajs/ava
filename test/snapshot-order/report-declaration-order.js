import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';

import getSnapshotIds from './helpers/get-snapshot-ids.js';

test('snapshot reports are sorted in declaration order', async t => {
	const options = {
		cwd: cwd('report-declaration-order'),
		env: {
			AVA_FORCE_CI: 'not-ci',
		},
	};

	// Scehdule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(path.join(options.cwd, 'test.js.snap'));
		fs.unlinkSync(reportPath);
	});

	await fixture(['--update-snapshots'], options);

	const reportPath = path.join(options.cwd, 'test.js.md');

	const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
	const ids = getSnapshotIds(report);

	t.deepEqual(ids, [...ids].sort((a, b) => a - b));
});
