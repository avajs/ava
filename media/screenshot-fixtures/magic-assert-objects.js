import test from 'ava';

test('objects', t => {
	const actual = {
		a: 1,
		b: {
			c: 2
		}
	};

	const expected = {
		a: 1,
		b: {
			c: 3
		}
	};

	t.deepEqual(actual, expected);
});
