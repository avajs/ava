const test = require('@ava/test');
const exec = require('../helpers/exec');

test('load ts as commonjs', async t => {
	const result = await exec.fixture(['*.ts', '--config', 'custom.config.js']);
	const files = new Set(result.stats.passed.map(({file}) => file));
	t.is(files.size, 1);
	t.true(files.has('test.ts'));
});
