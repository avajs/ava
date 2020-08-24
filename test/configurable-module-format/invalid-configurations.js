const test = require('@ava/test');
const exec = require('../helpers/exec');

const stripLeadingFigures = string => string.replace(/^\W+/, '');

test('cannot configure how js extensions should be loaded', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'change-js-loading.config.js']));
	t.snapshot(stripLeadingFigures(result.stderr.trim()));
});

test('cannot configure how cjs extensions should be loaded', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'change-cjs-loading.config.js']));
	t.snapshot(stripLeadingFigures(result.stderr.trim()));
});

test('cannot configure how mjs extensions should be loaded', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'change-mjs-loading.config.js']));
	t.snapshot(stripLeadingFigures(result.stderr.trim()));
});

test('custom extensions must be either commonjs or module', async t => {
	const result = await t.throwsAsync(exec.fixture(['--config', 'bad-custom-type.config.js']));
	t.snapshot(stripLeadingFigures(result.stderr.trim()));
});
