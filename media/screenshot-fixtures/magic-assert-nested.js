import test from 'ava';

test('nested', t => {
	const actual = {
		a: {
			b: false
		}
	};

	t.true(actual.a.b);
});
