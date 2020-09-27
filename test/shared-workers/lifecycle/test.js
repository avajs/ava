const test = require('@ava/test');
const exec = require('../../helpers/exec');

test('availability', async t => {
	await t.notThrowsAsync(exec.fixture(['available.js']));
});

test('teardown', async t => {
	const result = await exec.fixture('teardown.js');
	t.true(result.stderr.includes('TEARDOWN CALLED'));
});
