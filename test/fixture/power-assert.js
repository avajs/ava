import test from '../../';

test(t => {
  const a = 'foo';

	t.ok(a === 'bar');
	t.end();
});
