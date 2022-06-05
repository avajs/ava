import test from 'ava';

test('like', t => {
	t.like({
		map: new Map([['foo', 'bar']]),
		nested: {
			baz: 'thud',
			qux: 'quux',
		},
	}, {
		map: new Map([['foo', 'bar']]),
		nested: {
			baz: 'thud',
		},
	});

	type Foo = {
		foo?: 'foo';
		bar?: 'bar';
	};

	const foo: Foo = {bar: 'bar'};
	const {foo: _, ...expected} = foo;
	t.like(expected, {bar: 'bar'});
});
