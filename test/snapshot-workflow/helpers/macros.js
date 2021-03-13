const exec = require('../../helpers/exec');
const path = require('path');
const fs = require('fs').promises;
const concordance = require('concordance');
const {withTemporaryFixture} = require('../../helpers/with-temporary-fixture');

function cleanStringDiff(before, after) {
	const theme = {
		string: {
			multiline: {
				start: '',
				end: ''
			}
		}
	};
	let diff = concordance.diff(before, after, {theme});
	// Remove all newline control characters, or they'll be duplicated in the
	// snapshot report
	diff = diff.replace(/␊/g, '');
	return diff;
}

async function beforeAndAfter(t, {
	cwd,
	expectChanged,
	env = {},
	cli = []
}) {
	const updating = process.argv.includes('--update-fixture-snapshots');

	if (updating) {
		// Run template
		await exec.fixture(['--update-snapshots'], {
			cwd,
			env: {
				TEMPLATE: 'true',
				AVA_FORCE_CI: 'not-ci'
			}
		});
	}

	const before = await readSnapshots(cwd);

	// Copy fixture to a temporary directory
	await withTemporaryFixture(cwd, async cwd => {
		// Run fixture
		await exec.fixture(cli, {cwd, env: {AVA_FORCE_CI: 'not-ci', ...env}});

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

exports.beforeAndAfter = beforeAndAfter;

async function readSnapshots(cwd) {
	const [snapshot, report] = await Promise.all([
		fs.readFile(path.join(cwd, 'test.js.snap')),
		fs.readFile(path.join(cwd, 'test.js.md'), 'utf8')
	]);
	return {snapshot, report};
}
