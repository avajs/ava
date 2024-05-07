import test from 'ava';
import {hexToUint8Array} from 'uint8array-extras';

test('buffers', t => {
	const actual = hexToUint8Array('decafbadcab00d1e'.repeat(4))
	const expected = hexToUint8Array('cab00d1edecafbad' + 'decafbadcab00d1e'.repeat(3))
	t.deepEqual(actual, expected)
});
