const test = require('@ava/test');
const exec = require('../helpers/exec');

test('happy path', async t => {
	const result = await exec.fixture(['happy-path.js']);
	t.snapshot(result.stats.passed.map(({title}) => title));
});
