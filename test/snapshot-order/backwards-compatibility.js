const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs');
const path = require('path');
const getSnapshotIds = require('./helpers/get-snapshot-ids');

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
