const test = require('@ava/test');
const exec = require('../../helpers/exec');

test('can only be used when worker threads are enabled', async t => {
	let result = await t.throwsAsync(exec.fixture(['--no-worker-threads']));
	t.true(result.failed);
	t.true(result.stdout.includes('Error: Shared workers can be used only when worker threads are enabled'));
	result = await exec.fixture([]);
	t.false(result.failed);
});
