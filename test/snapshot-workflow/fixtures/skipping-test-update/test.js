const test = require('ava');

(process.env.TEMPLATE ? test : test.skip)('foo', t => {
	t.snapshot(process.env.TEMPLATE ? {foo: 'one'} : ['something new']);
});

test('bar', t => {
	t.snapshot(process.env.TEMPLATE ? {bar: 'one'} : ['something new']);
});
