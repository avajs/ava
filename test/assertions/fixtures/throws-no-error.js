import test from 'ava';

test('throws without throwing', t => {
	t.throws(() => {});
});
