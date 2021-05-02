const test = require('../../entrypoints/main.cjs');

test('argv', t => {
	t.deepEqual(process.argv, [process.execPath, require.resolve('../../lib/worker/base'), '--hello', 'world']);
});
