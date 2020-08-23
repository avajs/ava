const test = require('@ava/test');
const exec = require('../helpers/exec');

const stripLeadingFigures = string => string.replace(/^\W+/, '');

test('opt-in is required', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'not-enabled.config.js']));
	t.is(result.exitCode, 1);
	t.snapshot(stripLeadingFigures(result.stderr.trim()));
});
