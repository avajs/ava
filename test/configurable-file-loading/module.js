const test = require('@ava/test');
const exec = require('../helpers/exec');

test('load mjs as module', async t => {
	const result = await exec.fixture(['*.mjs', '--config', 'default.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.mjs'));
});
