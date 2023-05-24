import assert from 'node:assert';

import test from 'ava';

test('test', () => {
	assert(false);
});

test('test async', async () => {
	assert(await Promise.resolve(false));
});
