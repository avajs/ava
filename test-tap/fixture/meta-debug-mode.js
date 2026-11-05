import test from '../../entrypoints/main.js';

test('meta.debugMode is true when debugging', t => {
	t.true(test.meta.debugMode);
});
