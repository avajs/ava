const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs').promises;
const path = require('path');

// Regression test for #2662
test('skipping snapshots with ids works', async t => {
	const cwd = exec.cwd('skip-id');
	const result = await exec.fixture([], {cwd});
	t.snapshot(result.stats.passed, 'passed tests');

	const report = await fs.readFile(path.join(cwd, 'test.js.md'), 'utf8');
	t.snapshot(report, 'snapshot report');
});
