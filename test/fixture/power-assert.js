import test from '../../';

test.serial(t => {
	const a = 'foo';

	t.ok(a === 'bar');
});

test.serial(t => {
	const a = 'bar';

	t.ok(a === 'foo', 'with message');
});
