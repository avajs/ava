import test from '../..';

test('test', t => {
	const circular = ['a', 'b'];
	circular.push(circular);
	t.deepEqual([circular, 'c'], [circular, 'd']);
});
