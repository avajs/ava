import test from 'ava';

test('power-assert', t => {
	const a = /foo/;
	const b = 'bar';
	const c = 'baz';
	t.assert(a.test(b) || b === c);
});
