import fs from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

test('formatAsCodeBlock option renders fenced code blocks in the snapshot report', async t => {
	await withTemporaryFixture(cwd('code-block-snapshot'), async cwd => {
		await fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
			},
		});

		const reportPath = path.join(cwd, 'test.js.md');
		const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
		t.snapshot(report, 'resulting snapshot report');
	});
});
