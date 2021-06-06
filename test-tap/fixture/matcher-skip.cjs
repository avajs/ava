const test = require('../../entrypoints/main.cjs');

test('foo', t => {
	t.pass();
});

test('bar', t => {
	t.pass();
});

test('baz', t => {
	t.fail();
});

test('tests are fun', t => {
	t.pass();
});

test('tests are not fun', t => {
	t.fail();
});
