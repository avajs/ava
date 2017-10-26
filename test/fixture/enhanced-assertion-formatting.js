import test from '../..';

const foo = 'foo';

test('fails with multiple empty string expressions and mixed quotes', t => {
	// eslint-disable-next-line quotes, yoda
	t.true(foo === '' && "" === foo);
});

test('fails with "instanceof" expression', t => {
	// eslint-disable-next-line no-new-object
	t.false(new Object(foo) instanceof Object);
});

test('fails with multiple lines', t => {
	t.true(
		[foo].filter(item => {
			return item === 'bar';
		}).length > 0
	);
});
