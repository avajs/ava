'use strict';
const test = require('ava');

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.fail();
});

test('foo', t => {
	t.pass();
});

test('bar', t => {
	t.pass();
});

test('baz', t => {
	t.pass();
});
