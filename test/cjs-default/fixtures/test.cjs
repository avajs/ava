// @ts-ignore
const test = require('ava');

test.default('callable', t => {
	t.pass();
});

// @ts-ignore
test('no recursion', t => {
	// @ts-ignore
	t.throws(() => test.default.default, {
		name: 'TypeError',
	});
});

// @ts-ignore
test('not enumerable', t => {
	t.false(Object.keys(test).includes('default'));
});

// @ts-ignore
test('main export equals the ESM export', async t => {
	const {default: exported} = await import('ava'); // eslint-disable-line node/no-unsupported-features/es-syntax
	t.is(test, exported);
});
