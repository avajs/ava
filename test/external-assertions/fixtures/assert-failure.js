import assert from 'node:assert';

import test from 'ava';

test('test', () => {
	assert.ok(false); // eslint-disable-line node-test/no-constant-assertion
});

test('test async', async () => {
	assert.ok(await Promise.resolve(false));
});
