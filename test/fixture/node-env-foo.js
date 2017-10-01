import test from '../../';

test('NODE_ENV is foo', t => {
	t.plan(1);
	t.is(process.env.NODE_ENV, 'foo');
});
