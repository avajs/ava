const test = require('@ava/test');
const exec = require('../helpers/exec');
const {concurrencyLimiter, testSnapshotPruning, withTemporaryFixture} = require('./helpers/macros');
const fs = require('fs').promises;
const path = require('path');

const macro = (t, {cwd, ...options}) => withTemporaryFixture(t, cwd, (t, temporary) => testSnapshotPruning(t, {cwd: temporary, ...options}));
const limited = concurrencyLimiter(2);

test('snapshots are removed when tests stop using them', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots'],
	remove: true
});

test('snapshots are removed from a snapshot directory', limited, macro, {
	cwd: exec.cwd('snapshot-dir'),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotPath: path.join('test', 'snapshots', 'test.js.snap'),
	reportPath: path.join('test', 'snapshots', 'test.js.md')
});

test('snapshots are removed from a custom snapshotDir', limited, macro, {
	cwd: exec.cwd('fixed-snapshot-dir'),
	cli: ['--update-snapshots'],
	remove: true,
	snapshotPath: path.join('fixedSnapshotDir', 'test.js.snap'),
	reportPath: path.join('fixedSnapshotDir', 'test.js.md')
});

test('removing non-existent snapshots doesn\'t throw',
	limited,
	withTemporaryFixture,
	exec.cwd('no-snapshots'),
	async (t, cwd) => {
		// Execute fixture; this should try to unlink the nonexistent snapshots, and
		// should not throw
		const run = exec.fixture(['--update-snapshots'], {
			cwd,
			env: {
				AVA_FORCE_CI: 'not-ci'
			}
		});

		await t.notThrowsAsync(run);
	}
);

test(
	'without --update-snapshots, invalid .snaps are retained',
	limited,
	withTemporaryFixture,
	exec.cwd('no-snapshots'),
	async (t, cwd) => {
		const snapPath = path.join(cwd, 'test.js.snap');
		const invalid = Buffer.of(0x0A, 0x00, 0x00);
		await fs.writeFile(snapPath, invalid);

		await exec.fixture([], {cwd});

		await t.notThrowsAsync(fs.access(snapPath));
		t.deepEqual(await fs.readFile(snapPath), invalid);
	}
);

test(
	'with --update-snapshots, invalid .snaps are removed',
	limited,
	withTemporaryFixture,
	exec.cwd('no-snapshots'),
	async (t, cwd) => {
		const snapPath = path.join(cwd, 'test.js.snap');
		const invalid = Buffer.of(0x0A, 0x00, 0x00);
		await fs.writeFile(snapPath, invalid);

		await exec.fixture(['--update-snapshots'], {cwd});

		await t.throwsAsync(fs.access(snapPath), {code: 'ENOENT'}, 'Expected snapshot to be removed');
	}
);

test('snapshots remain if not updating', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: [],
	remove: false
});

test('snapshots remain if they are still used', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots'],
	remove: false,
	env: {
		TEMPLATE: 'true'
	},
	async checkRun(t, run) {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	}
});

test('snapshots remain if tests run with --match', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*another*\''],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	}
});

test('snapshots removed if --match selects all tests', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['--update-snapshots', '--match=\'*snapshot*\''],
	remove: true,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	}
});

test('snapshots remain if tests selected by line numbers', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['test.js:10-17', '--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	}
});

test('snapshots removed if line numbers select all tests', limited, macro, {
	cwd: exec.cwd('removal'),
	cli: ['test.js:0-100', '--update-snapshots'],
	remove: true,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
		const result = await run;
		t.snapshot(result.stats.passed, 'passed tests');
	}
});

test('snapshots remain if using test.only', limited, macro, {
	cwd: exec.cwd('only-test'),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
});

test('snapshots remain if tests are skipped', limited, macro, {
	cwd: exec.cwd('skipped-tests'),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
});

test('snapshots remain if snapshot assertions are skipped', limited, macro, {
	cwd: exec.cwd('skipped-snapshots'),
	cli: ['--update-snapshots'],
	remove: false,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
});

// This behavior is consistent with the expectation that discarded attempts
// should have no effect.
test('snapshots removed if used in a discarded try()', limited, macro, {
	cwd: exec.cwd('try'),
	cli: ['--update-snapshots'],
	remove: true
});

// This behavior is consistent with the expectation that discarded attempts
// should have no effect.
test('snapshots removed if skipped in a discarded try()', limited, macro, {
	cwd: exec.cwd('skipped-snapshots-in-try'),
	cli: ['--update-snapshots'],
	remove: true,
	checkRun: async (t, run) => {
		await t.notThrowsAsync(run, 'Expected fixture not to throw');
	}
});
