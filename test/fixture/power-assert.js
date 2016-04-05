import test from '../../';

test.serial(t => {
	const a = 'foo';

	t.true(a === 'bar');
});

test.serial(t => {
	const a = 'bar';

	t.true(a === 'foo', 'with message');
});
