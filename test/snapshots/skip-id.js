const test = require('@ava/test');
const exec = require('../helpers/exec');

// Regression test for #2662
test('skipping snapshots with ids works', async t => {
	const result = await exec.fixture([]);
	t.snapshot(result.stats.passed, 'passed tests');
	// TODO snapshot the report file, it's also affected
});
