import test from '../../';

test(t => {
	const circular = ['a', 'b'];
	circular.push(circular);
	t.same([circular, 'c'], [circular, 'd']);
});
