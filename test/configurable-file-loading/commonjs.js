const test = require('@ava/test');
const exec = require('../helpers/exec');

test('load js and cjs as commonjs (default configuration)', async t => {
	const result = await exec.fixture(['*.js', '*.cjs']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});

test('load js and cjs as commonjs (using an extensions array)', async t => {
	const result = await exec.fixture(['*.js', '*.cjs', '--config', 'array-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});

test('load js and cjs as commonjs (using an extensions object)', async t => {
	const result = await exec.fixture(['*.js', '*.cjs', '--config', 'object-extensions.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 2);
	t.true(files.has('test.cjs'));
	t.true(files.has('test.js'));
});
