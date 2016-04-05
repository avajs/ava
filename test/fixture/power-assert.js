import test from '../../';

test.serial(t => {
	const a = 'foo';

	t.truthy(a === 'bar');
});

test.serial(t => {
	const a = 'bar';

	t.truthy(a === 'foo', 'with message');
});
