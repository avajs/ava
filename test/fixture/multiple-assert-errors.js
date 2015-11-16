import test from '../../';

test(t => {
	const a = 'foo';
	t.ok(a === 'bar');

	const b = 'kung';
	t.ok(b === 'foo');

	t.end();
});
