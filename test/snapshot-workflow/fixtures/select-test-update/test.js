const test = require('ava');

test('foo', t => {
	t.snapshot(process.env.TEMPLATE ? {foo: 'one'} : {foo: 'new'});
});

test('bar', t => {
	t.snapshot(process.env.TEMPLATE ? {bar: 'one'} : {bar: 'new'});
});
