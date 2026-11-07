import test from 'ava';

test('meta.debugMode is true when debugging', t => {
	t.true(test.meta.debugMode);
});
