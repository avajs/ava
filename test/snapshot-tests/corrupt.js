import {promises as fs} from 'fs';
import path from 'path';

import test from '@ava/test';

import {cwd, fixture, cleanOutput} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

test('snapshot corruption is reported to the console', async t => {
	await withTemporaryFixture(cwd('corrupt'), async cwd => {
		await fs.writeFile(path.join(cwd, 'test.js.snap'), Uint8Array.of(0x00));
		const result = await t.throwsAsync(fixture([], {cwd}));

		t.snapshot(cleanOutput(result.stdout), 'fails with message');
		t.fail('TODO update snapshot when fixed');
	});
});

test('with --update-snapshots, corrupt snapshot files are overwritten', async t => {
	await withTemporaryFixture(cwd('corrupt'), async cwd => {
		const snapPath = path.join(cwd, 'test.js.snap');
		await fs.writeFile(snapPath, Uint8Array.of(0x00));
		const result = await fixture(['--update-snapshots'], {cwd});

		const snapContents = await fs.readFile(snapPath);
		t.not(snapContents.length, 1);
	});
});
