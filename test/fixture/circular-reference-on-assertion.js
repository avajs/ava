import test from '../../';

test(t => {
	var circular = ['a', 'b'];
	circular.push(circular);
	t.same([circular, 'c'], [circular, 'd']);
	t.end();
});
