import test from 'ava';

test('buffers', t => {
	const actual = Buffer.from('decafbadcab00d1e'.repeat(4), 'hex')
	const expected = Buffer.from('cab00d1edecafbad' + 'decafbadcab00d1e'.repeat(3), 'hex')
	t.deepEqual(actual, expected)
});
