const test = require('../../entrypoints/main.cjs');

test('test', t => {
	t.deepEqual({foo: 1}, {foo: 2});
});
