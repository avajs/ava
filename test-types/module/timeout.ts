import test from '../../entrypoints/main.mjs';

test('test', t => {
	t.timeout(100);
	t.timeout.clear();
});
