import test from '../../';

test(t => {
	const circular = ['a', 'b'];
	circular.push(circular);
	t.deepEqual([circular, 'c'], [circular, 'd']);
});
