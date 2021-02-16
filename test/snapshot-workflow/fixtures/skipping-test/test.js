const test = require('ava');

(process.env.TEMPLATE ? test : test.skip)('foo', t => {
	t.snapshot({foo: 'one'});
});

test('bar', t => {
	t.snapshot({bar: 'one'});
});
