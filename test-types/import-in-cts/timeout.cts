import test from '../../entrypoints/main.cjs';

test('test', t => {
	t.timeout(100);
	t.timeout.clear();
});
