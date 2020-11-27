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
	// Run, updating snapshots.
	await exec.fixture(['test.js', '--update-snapshots'], options);

	// Read the resulting file
	const snapshotPath = path.join(options.cwd, 'test.js.snap');
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

test('snapshot reports are sorted in declaration order', async t => {
	const options = {
		cwd: exec.cwd('report-declaration-order'),
		env: {
			AVA_FORCE_CI: 'not-ci'
		}
	};

	await exec.fixture(['--update-snapshots'], options);

	const report = fs.readFileSync(path.join(options.cwd, 'test.js.md'), {encoding: 'utf8'});

	function * matchAll(string, regexp) {
		let match;
		while ((match = regexp.exec(string)) !== null) {
			yield match;
		}
	}

	const ids = [...matchAll(report, /'index: ([-.\d]+)'/g)].map(match => Number(match[1]));
	const sortedIds = [...ids].sort((a, b) => a - b);

	t.deepEqual(ids, sortedIds);
});
