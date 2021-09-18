import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import test from '@ava/test';
import {mainSymbols, fallbackSymbols} from 'figures';
import replaceString from 'replace-string';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

test('multiline snapshot label should be formatted correctly in the report', async t => {
	await withTemporaryFixture(cwd('multiline-snapshot-label'), async cwd => {
		// Run test fixture
		await fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
			},
		});

		// Assert report is unchanged
		const reportPath = path.join(cwd, 'test.js.md');
		const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
		t.snapshot(report, 'resulting snapshot report');
	});
});

test('test title should be normalized in stdout', async t => {
	await withTemporaryFixture(cwd('normalized-title-in-stdout'), async cwd => {
		// Run test fixture
		const result = await fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
			},
		});

		// Assert stdout is unchanged
		t.snapshot(
			replaceString(
				replaceString(
					replaceString(result.stdout, os.EOL, '\n'),
					mainSymbols.info, fallbackSymbols.info,
				),
				mainSymbols.tick, fallbackSymbols.tick,
			),
			'stdout');
	});
});

test('test title should be normalized in snapshot', async t => {
	await withTemporaryFixture(cwd('normalized-title-in-snapshots'), async cwd => {
		// Run test fixture
		await fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
			},
		});

		// Assert report is unchanged
		const reportPath = path.join(cwd, 'test.js.md');
		const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
		t.snapshot(report, 'resulting snapshot report');
	});
});
