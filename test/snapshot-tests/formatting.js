import fs from 'fs';
import path from 'path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';

test('multiline snapshot label should be formatted correctly in the report', async t => {
	const options = {
		cwd: cwd('multiline-snapshot-label'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	// Run test fixture
	await fixture(['--update-snapshots'], options);
	
	// Assert report is unchanged
	const reportPath = path.join(options.cwd, 'test.js.md');

	const report = fs.readFileSync(reportPath, { encoding: 'utf8' });

	t.snapshot(report, 'resulting snapshot report');
});
