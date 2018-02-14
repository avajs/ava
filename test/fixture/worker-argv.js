import test from '../..';

test('argv', t => {
	t.deepEqual(process.argv, [process.execPath, require.resolve('../../lib/test-worker.js'), '--hello', 'world']);
});
