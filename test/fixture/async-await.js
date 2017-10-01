import test from '../../';

test('async function', async t => {
	t.plan(1);
	const value = await Promise.resolve(1);
	t.is(value, 1);
});

test('arrow async function', async t => {
	t.plan(1);
	const value = await Promise.resolve(1);
	t.is(value, 1);
});
