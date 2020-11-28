const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');

test('snapshot files are independent of test resolution order', async t => {
	const options = {
		cwd: exec.cwd('intertest-order'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(path.join(options.cwd, 'test.js.md'));
	});

	// Run, updating snapshots.
	await exec.fixture(['test.js', '--update-snapshots'], options);

	// Read the resulting file
	const snapshot = fs.readFileSync(snapshotPath);

	// Run in reversed order, updating snapshots.
	await exec.fixture(['test.js', '--update-snapshots'], {
		...options,
		env: {
			INTERTEST_ORDER_REVERSE: 'true',
			...options.env
		}
	});

	// Read the resulting file
	const snapshotReversed = fs.readFileSync(snapshotPath);

	// Compare snapshots
	t.deepEqual(snapshot, snapshotReversed);
});

function getSnapshotIds(report) {
	function * matchAll(string, regexp) {
		let match;
		while ((match = regexp.exec(string)) !== null) {
			yield match;
		}
	}

	const ids = [...matchAll(report, /'index: ([-.\d]+)'/g)].map(match => Number(match[1]));

	return ids;
}

test('snapshot reports are sorted in declaration order', async t => {
	const options = {
		cwd: exec.cwd('report-declaration-order'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	// Scehdule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(path.join(options.cwd, 'test.js.snap'));
		fs.unlinkSync(reportPath);
	});

	await exec.fixture(['--update-snapshots'], options);

	const reportPath = path.join(options.cwd, 'test.js.md');

	const report = fs.readFileSync(reportPath, {encoding: 'utf8'});
	const ids = getSnapshotIds(report);

	t.deepEqual(ids, [...ids].sort((a, b) => a - b));
});

test('deterministic and sorted over a large, random test case', async t => {
	const options = {
		cwd: exec.cwd('randomness'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Run test
	await exec.fixture(['--update-snapshots'], options);

	// Assert snapshot is unchanged
	const snapshot = fs.readFileSync(snapshotPath);

	t.snapshot(snapshot);

	// Assert report is sorted
	const report = fs.readFileSync(reportPath);
	const ids = getSnapshotIds(report);

	t.deepEqual(ids, [...ids].sort((a, b) => a - b));
});

const unsortedSnapshotPath = path.join(__dirname, 'fixtures', 'backwards-compatibility', 'unsorted', 'test.js.snap');
const unsortedReportPath = path.join(__dirname, 'fixtures', 'backwards-compatibility', 'unsorted', 'test.js.md');

const unsortedSnapshot = fs.readFileSync(unsortedSnapshotPath);
const unsortedReport = fs.readFileSync(unsortedReportPath);

test('unsorted snapshots are unchanged when checking', async t => {
	const options = {
		cwd: exec.cwd('backwards-compatibility', 'check-only'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(reportPath);
	});

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Install a known-unsorted snapshot, report
	fs.copyFileSync(unsortedSnapshotPath, snapshotPath);
	fs.copyFileSync(unsortedReportPath, reportPath);

	// Run test
	await exec.fixture([], options);

	// Assert snapshot, report are unchanged
	const snapshot = fs.readFileSync(snapshotPath);
	const report = fs.readFileSync(reportPath);

	t.deepEqual(snapshot, unsortedSnapshot);
	t.deepEqual(report, unsortedReport);
});

test('unsorted snapshots are changed when appending', async t => {
	const options = {
		cwd: exec.cwd('backwards-compatibility', 'append-only'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(reportPath);
	});

	// Install a known-unsorted snapshot, report
	fs.copyFileSync(unsortedSnapshotPath, snapshotPath);
	fs.copyFileSync(unsortedReportPath, reportPath);

	// Run test
	await exec.fixture([], options);

	// Assert snapshot, report are changed
	const snapshot = fs.readFileSync(snapshotPath);
	const report = fs.readFileSync(reportPath);

	t.notDeepEqual(snapshot, unsortedSnapshot);
	t.notDeepEqual(report, unsortedReport);

	// Assert entries appended to report are sorted
	const textReport = report.toString();
	const ids = getSnapshotIds(textReport);

	t.deepEqual(ids, [2, 1, 3, 4]);
});

test('unsorted snapshots are changed when updating', async t => {
	const options = {
		cwd: exec.cwd('backwards-compatibility', 'updating'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	// Schedule snapshot cleanup
	t.teardown(() => {
		fs.unlinkSync(snapshotPath);
		fs.unlinkSync(reportPath);
	});

	const snapshotPath = path.join(options.cwd, 'test.js.snap');
	const reportPath = path.join(options.cwd, 'test.js.md');

	// Install a known-unsorted snapshot, report
	fs.copyFileSync(unsortedSnapshotPath, snapshotPath);
	fs.copyFileSync(unsortedReportPath, reportPath);

	// Run test
	await exec.fixture(['--update-snapshots'], options);

	// Assert snapshot, report are changed
	const snapshot = fs.readFileSync(snapshotPath);
	const report = fs.readFileSync(reportPath);

	t.notDeepEqual(snapshot, unsortedSnapshot);
	t.notDeepEqual(report, unsortedReport);

	// Assert report is sorted
	const textReport = report.toString();
	const ids = getSnapshotIds(textReport);

	t.deepEqual(ids, [1, 2]);
});
