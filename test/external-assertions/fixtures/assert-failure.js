import assert from 'node:assert';

import test from 'ava';

test('test', () => {
	assert.ok(false);
});

test('test async', async () => {
	assert.ok(await Promise.resolve(false));
});
