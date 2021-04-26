const test = require('@ava/test');
const exec = require('../helpers/exec');

const fs = require('fs').promises;
const path = require('path');

require('../../lib/chalk').set({level: 0});
require('../../lib/worker/options.cjs').set({});
const {load} = require('../../lib/snapshot-manager');

test('snapshot report can be regenerated from .snap file', async t => {
	const cwd = exec.cwd();
	const env = {
		AVA_FORCE_CI: 'not-ci'
	};
	const reportPath = path.join(cwd, 'test.js.md');

	t.teardown(() => fs.unlink(reportPath));
	t.teardown(() => fs.unlink(path.join(cwd, 'test.js.snap')));

	// Run fixture to generate report, snapshot
	await exec.fixture(['--update-snapshots'], {cwd, env});

	// Read report
	const report = await fs.readFile(reportPath, 'utf8');

	// Delete report
	await fs.unlink(reportPath);

	// Load snapshot manager from .snap file
	const snapshots = load({
		file: path.join(cwd, 'test.js'),
		projectDir: cwd
	});

	// Regenerate report
	snapshots.hasChanges = true; // TODO this is a hack
	snapshots.save();

	// Assert that reports match
	t.is(await fs.readFile(reportPath, 'utf8'), report);
});
