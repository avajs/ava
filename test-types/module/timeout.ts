import test from '../../entrypoints/main.js';

test('test', t => {
	t.timeout(100);
	t.timeout.clear();
});
