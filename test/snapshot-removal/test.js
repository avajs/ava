import {Buffer} from 'node:buffer';
import {promises as fs} from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {cwd, fixture} from '../helpers/exec.js';
import {withTemporaryFixture} from '../helpers/with-temporary-fixture.js';

import {testSnapshotPruning} from './helpers/macros.js';

// To update the test fixture templates, run:
// npx test-ava test/snapshot-removal/** -- --update-fixture-snapshots

// Serial execution is used here solely to reduce the burden on CI machines.

test.serial('snapshots are removed when tests stop using them', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['--update-snapshots'],
	remove: true,
});

test.serial('snapshots are removed from a snapshot directory', testSnapshotPruning, {
	cwd: cwd('snapshot-dir'),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotFile: path.join('test', 'snapshots', 'test.js.snap'),
	reportFile: path.join('test', 'snapshots', 'test.js.md'),
});

test.serial('snapshots are removed from a custom snapshotDir', testSnapshotPruning, {
	cwd: cwd('fixed-snapshot-dir'),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotFile: path.join('fixedSnapshotDir', 'test.js.snap'),
	reportFile: path.join('fixedSnapshotDir', 'test.js.md'),
});

test.serial('removing non-existent snapshots doesn\'t throw', async t => {
	await withTemporaryFixture(cwd('no-snapshots'), async cwd => {
		// Execute fixture; this should try to unlink the nonexistent snapshots, and
		// should not throw
		const run = fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci',
			},
		});

		await t.notThrowsAsync(run);
	});
});

test.serial('without --update-snapshots, invalid .snaps are retained', async t => {
	await withTemporaryFixture(cwd('no-snapshots'), async cwd => {
		const snapPath = path.join(cwd, 'test.js.snap');
		const invalid = Buffer.of(0x0A, 0x00, 0x00);
		await fs.writeFile(snapPath, invalid);

		await fixture([], {cwd});

		await t.notThrowsAsync(fs.access(snapPath));
		t.deepEqual(await fs.readFile(snapPath), invalid);
	});
});

test.serial('with --update-snapshots, invalid .snaps are removed', async t => {
	await withTemporaryFixture(cwd('no-snapshots'), async cwd => {
		const snapPath = path.join(cwd, 'test.js.snap');
		const invalid = Buffer.of(0x0A, 0x00, 0x00);
		await fs.writeFile(snapPath, invalid);

		await fixture(['--update-snapshots'], {cwd});

		await t.throwsAsync(fs.access(snapPath), {code: 'ENOENT'}, 'Expected snapshot to be removed');
	});
});

test.serial('snapshots remain if not updating', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: [],
	remove: false,
});

test.serial('snapshots remain if they are still used', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['--update-snapshots'],
	remove: false,
	env: {
		TEMPLATE: 'true',
	},
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	},
});

test.serial('snapshots remain if tests run with --match', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*another*\''],
	remove: false,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	},
});

test.serial('snapshots removed if --match selects all tests', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*snapshot*\''],
	remove: true,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	},
});

test.serial('snapshots remain if tests selected by line numbers', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['test.js:10-17', '--update-snapshots'],
	remove: false,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	},
});

test.serial('snapshots removed if line numbers select all tests', testSnapshotPruning, {
	cwd: cwd('removal'),
	cli: ['test.js:0-100', '--update-snapshots'],
	remove: true,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	},
});

test.serial('snapshots remain if using test.only', testSnapshotPruning, {
	cwd: cwd('only-test'),
	cli: ['--update-snapshots'],
	remove: false,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	},
});

test.serial('snapshots remain if tests are skipped', testSnapshotPruning, {
	cwd: cwd('skipped-tests'),
	cli: ['--update-snapshots'],
	remove: false,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	},
});

test.serial('snapshots remain if snapshot assertions are skipped', testSnapshotPruning, {
	cwd: cwd('skipped-snapshots'),
	cli: ['--update-snapshots'],
	remove: false,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	},
});

// This behavior is consistent with the expectation that discarded attempts
// should have no effect.
test.serial('snapshots removed if used in a discarded try()', testSnapshotPruning, {
	cwd: cwd('try'),
	cli: ['--update-snapshots'],
	remove: true,
});

// This behavior is consistent with the expectation that discarded attempts
// should have no effect.
test.serial('snapshots removed if skipped in a discarded try()', testSnapshotPruning, {
	cwd: cwd('skipped-snapshots-in-try'),
	cli: ['--update-snapshots'],
	remove: true,
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	},
});
