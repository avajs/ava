import {promises as fs} from 'node:fs';
import path from 'node:path';

import test from '@ava/test';

import {set as setChalk} from '../../lib/chalk.js';
import {load} from '../../lib/snapshot-manager.js';
import {set as setOptions} from '../../lib/worker/options.cjs';
import {cwd, fixture} from '../helpers/exec.js';

setChalk({level: 0});
setOptions({});

test('snapshot report can be regenerated from .snap file', async t => {
	const workingDir = cwd();
	const env = {
		AVA_FORCE_CI: 'not-ci',
	};
	const reportPath = path.join(workingDir, 'test.js.md');

	t.teardown(() => fs.unlink(reportPath));
	t.teardown(() => fs.unlink(path.join(workingDir, 'test.js.snap')));

	// Run fixture to generate report, snapshot
	await fixture(['--update-snapshots'], {cwd: workingDir, env});

	// Read report
	const report = await fs.readFile(reportPath, 'utf8');

	// Delete report
	await fs.unlink(reportPath);

	// Load snapshot manager from .snap file
	const snapshots = load({
		file: path.join(workingDir, 'test.js'),
		projectDir: workingDir,
	});

	// Regenerate report
	snapshots.hasChanges = true; // Force.
	await snapshots.save();

	// Assert that reports match
	t.is(await fs.readFile(reportPath, 'utf8'), report);
});
