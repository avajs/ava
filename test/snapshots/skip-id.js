const test = require('@ava/test');
const exec = require('../helpers/exec');
const fs = require('fs').promises;
const path = require('path');

// Regression test for #2662
test('skipping snapshots with ids works', async t => {
	const result = await exec.fixture([]);
	t.snapshot(result.stats.passed, 'passed tests');

	const report = await fs.readFile(
		path.join(__dirname, 'fixtures', 'test.js.md'),
		{encoding: 'utf8'}
	);
	t.snapshot(report, 'snapshot report');
});
