import fs from 'fs';
import path from 'path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

test('multiline snapshot label should be formatted correctly in the report', async t => {
	await withTemporaryFixture(cwd('multiline-snapshot-label'), async cwd => {
		// Run test fixture
		await fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci'
			}
		});

		// Assert report is unchanged
		const reportPath = path.join(cwd, 'test.js.md');
		const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
		t.snapshot(report, 'resulting snapshot report');
	});
});
