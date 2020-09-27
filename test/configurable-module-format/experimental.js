const test = require('@ava/test');
const exec = require('../helpers/exec');

test('opt-in is required', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'not-enabled.config.js']));
	t.is(result.exitCode, 1);
	t.snapshot(exec.cleanOutput(result.stderr));
});
