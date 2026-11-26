import test from '../../../entrypoints/main.js';

test.beforeEach(t => {
	t.teardown(() => {
		throw new Error('cleanup failed');
	});
});

test('passes', t => {
	t.pass();
});
