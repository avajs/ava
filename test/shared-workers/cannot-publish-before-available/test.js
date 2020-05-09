const test = require('@ava/test');
const exec = require('../../helpers/exec');

test('shared worker plugins work', async t => {
	const result = await exec.fixture();
	t.snapshot(result.stats.passed);
});
