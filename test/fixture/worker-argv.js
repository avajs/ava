import test from '../..';

test('argv', t => {
	t.deepEqual(process.argv, [process.execPath, require.resolve('../../lib/worker/subprocess.js'), '--hello', 'world']);
});
