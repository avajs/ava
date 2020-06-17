import test from '..';

test('like', t => {
	t.like({
		map: new Map([['foo', 'bar']]),
		nested: {
			baz: 'thud',
			qux: 'quux'
		}
	}, {
		map: new Map([['foo', 'bar']]),
		nested: {
			baz: 'thud'
		}
	});
});

