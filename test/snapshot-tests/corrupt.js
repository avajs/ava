import {promises as fs} from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

function countMatches(string, regex) {
	return [...string.matchAll(regex)].length;
}

function countStringMatches(string, patternString) {
	if (patternString.length === 0) {
		throw new RangeError('Pattern must be non-empty');
	}

	let index = string.indexOf(patternString);
	let matches = 0;
	while (index !== -1 && index < string.length) {
		matches++;
		index = string.indexOf(patternString, index + patternString.length);
	}

	return matches;
}

test('snapshot corruption is reported to the console', async t => {
	await withTemporaryFixture(cwd('corrupt'), async cwd => {
		const snapPath = path.join(cwd, 'test.js.snap');
		await fs.writeFile(snapPath, Uint8Array.of(0x00));
		const result = await t.throwsAsync(fixture([], {cwd}));
		t.snapshot(result.stats.failed, 'failed tests');
		t.is(countMatches(result.stdout, /The snapshot file is corrupted./g), 2);
		t.is(countMatches(result.stdout, /File path:/g), 2);
		t.is(
			countMatches(
				result.stdout,
				/Please run AVA again with the .*--update-snapshots.* flag to recreate it\./g,
			),
			2,
		);
		t.is(countStringMatches(result.stdout, snapPath), 2);
	});
});

test('with --update-snapshots, corrupt snapshot files are overwritten', async t => {
	await withTemporaryFixture(cwd('corrupt'), async cwd => {
		const snapPath = path.join(cwd, 'test.js.snap');
		const env = {
			AVA_FORCE_CI: 'not-ci',
		};
		await fs.writeFile(snapPath, Uint8Array.of(0x00));
		await fixture(['--update-snapshots'], {cwd, env});

		const snapContents = await fs.readFile(snapPath);
		t.not(snapContents.length, 1);
	});
});
