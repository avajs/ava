const test = require('../..');

test('argv', t => {
	t.deepEqual(process.argv, [process.execPath, require.resolve('../../lib/worker/base'), '--hello', 'world']);
});
