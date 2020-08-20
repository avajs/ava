const test = require('@ava/test');
const exec = require('../helpers/exec');

test('load ts as commonjs (using an extensions array)', async t => {
	const result = await exec.fixture(['*.ts', '--config', 'array-custom.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.ts'));
});

test('load ts as commonjs (using an extensions object)', async t => {
	const result = await exec.fixture(['*.ts', '--config', 'object-custom.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.ts'));
});
