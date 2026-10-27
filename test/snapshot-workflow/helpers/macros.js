
import {promises as fs} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {gunzipSync} from 'node:zlib';

import concordance from 'concordance';

import {extractCompressedSnapshot} from '../../../lib/snapshot-manager.js';
import {fixture} from '../../helpers/exec.js';
import {withTemporaryFixture} from '../../helpers/with-temporary-fixture.js';

function cleanStringDiff(before, after) {
	const theme = {
		string: {
			multiline: {
				start: '',
				end: '',
			},
		},
	};
	let diff = concordance.diff(before, after, {theme});
	// Remove all newline control characters, or they'll be duplicated in the
	// snapshot report
	diff = diff.replaceAll('␊', '');
	return diff;
}

export async function beforeAndAfter(t, {
	cwd: fixtureDirectory,
	expectChanged,
	env = {},
	cli = [],
}) {
	const updating = process.argv.includes('--update-fixture-snapshots');

	if (updating) {
		// Run template
		await fixture(['--update-snapshots'], {
			cwd: fixtureDirectory,
			env: {
				TEMPLATE: 'true',
				AVA_FORCE_CI: 'not-ci',
			},
		});
	}

	const before = await readSnapshots(fixtureDirectory);

	// Copy fixture to a temporary directory
	await withTemporaryFixture(fixtureDirectory, async cwd => {
		// Run fixture
		await fixture(cli, {cwd, env: {AVA_FORCE_CI: 'not-ci', ...env}});

		const after = await readSnapshots(cwd);

		if (expectChanged) {
			t.not(after.report, before.report, 'expected .md to be changed');
			t.notDeepEqual(after.snapshot, before.snapshot, 'expected .snap to be changed');
			t.snapshot(cleanStringDiff(before.report, after.report), 'snapshot report diff');
		} else {
			t.is(after.report, before.report, 'expected .md to be unchanged');
			t.deepEqual(after.snapshot, before.snapshot, 'expected .snap to be unchanged');
		}
	});
}

async function readSnapshots(cwd) {
	const snapPath = path.join(cwd, 'test.js.snap');
	const [snapshot, report] = await Promise.all([
		fs.readFile(snapPath),
		fs.readFile(path.join(cwd, 'test.js.md'), 'utf8'),
	]);

	const {version, compressed} = extractCompressedSnapshot(snapshot, snapPath);
	return {snapshot: {version, decompressed: gunzipSync(compressed)}, report};
}
