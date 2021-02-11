const test = require('@ava/test');
const exec = require('../helpers/exec');

const fs = require('fs').promises;
const path = require('path');

require('../../lib/chalk').set({level: 0});
require('../../lib/worker/options').set({});
const {load} = require('../../lib/snapshot-manager');

test('snapshot report can be regenerated from .snap file', async t => {
	const cwd = exec.cwd();
	const reportPath = path.join(cwd, 'test.js.md');

	// Run fixture to generate report, snapshot
	await exec.fixture(['--update-snapshots'], {cwd: exec.cwd()});

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
