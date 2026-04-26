import test from '../../entrypoints/main.js';

test('test', t => {
	t.deepEqual({foo: 1}, {foo: 2});
});
