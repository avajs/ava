const test = require('@ava/test');
const exec = require('../helpers/exec');

test('load js and cjs as commonjs', async t => {
	const result = await exec.fixture(['*.js', '*.cjs', '--config', 'default.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});
