/* eslint-disable ava/no-identical-title */

const test = require('ava');

if (process.env.TEMPLATE) {
	test('first test', t => {
		t.snapshot({foo: 'bar'});
	});

	test('second test', t => {
		t.snapshot({bar: 'baz'});
	});
} else {
	test('second test', t => {
		t.snapshot({bar: 'baz'});
	});

	test('first test', t => {
		t.snapshot({foo: 'bar'});
	});
}
