const test = require('ava');

test.before(async t => {
	await t.try(tt => tt.pass());

	t.pass();
});

test('can not use `t.try()` in hook', t => {
	t.pass();
});
