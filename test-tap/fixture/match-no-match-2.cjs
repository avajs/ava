const test = require('../../entrypoints/main.cjs');

test('this test will match', t => {
	t.pass();
});

test('this test will not match', t => {
	t.pass();
});

test('this test will also not match', t => {
	t.pass();
});
