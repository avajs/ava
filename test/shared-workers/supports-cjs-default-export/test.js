const test = require('@ava/test');
const exec = require('../../helpers/exec');

test('can load ESM workers', async t => {
	await t.notThrowsAsync(exec.fixture());
});
