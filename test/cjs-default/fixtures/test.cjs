const test = require('ava');

test.default('callable', t => {
	t.pass();
});

test('no recursion', t => {
	t.throws(() => test.default.default, {
		name: 'TypeError',
	});
});

test('not enumerable', t => {
	t.false(Object.keys(test).includes('default'));
});

test('main export equals the ESM export', async t => {
	const {default: exported} = await import('ava');
	t.is(test, exported);
});
