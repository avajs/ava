'use strict';

var test = require('tap').test;
var validate = require('../lib/validate-test');

var noop = function () {};

test('validate accepts basic test', function (t) {
	t.assert(validate('basic test', noop, {type: 'test'}) === null);
	t.end();
});

test('validate rejects tests without implementations except `todo` tests', function (t) {
	t.type(validate('test', null, {type: 'test'}), 'string');
	t.type(validate('before', null, {type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {type: 'after'}), 'string');
	t.type(validate('afterEach', null, {type: 'afterEach'}), 'string');
	t.end();
});

test('validate accepts proper todo', function (t) {
	t.assert(validate('proper todo', null, {todo: true, type: 'test'}) === null);
	t.end();
});

test('validate rejects todo with function', function (t) {
	t.type(validate('todo with function', noop, {todo: true, type: 'test'}), 'string');
	t.end();
});

test('validate rejects todo without title', function (t) {
	t.type(validate(null, null, {todo: true, type: 'test'}), 'string');
	t.end();
});

test('validate rejects todo with failing, skipped, or exclusive', function (t) {
	t.type(validate('failing', null, {todo: true, failing: true, type: 'test'}), 'string');
	t.type(validate('skipped', null, {todo: true, skipped: true, type: 'test'}), 'string');
	t.type(validate('exclusive', null, {todo: true, exclusive: true, type: 'test'}), 'string');
	t.end();
});

test('validate rejects todo when it\'s not a test', function (t) {
	t.type(validate('before', null, {todo: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {todo: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {todo: true, type: 'after'}), 'string');
	t.type(validate('afterEach', null, {todo: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate rejects skipped exclusive', function (t) {
	t.type(validate('skipped exclusive', noop, {exclusive: true, skipped: true, type: 'test'}), 'string');
	t.end();
});

test('validate rejects failing on non-tests', function (t) {
	t.type(validate('before', noop, {failing: true, type: 'test'}), 'null');
	t.type(validate('before', noop, {failing: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', noop, {failing: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', noop, {failing: true, type: 'after'}), 'string');
	t.type(validate('afterEach', noop, {failing: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate rejects failing on non-tests', function (t) {
	t.type(validate('before', noop, {exclusive: true, type: 'test'}), 'null');
	t.type(validate('before', noop, {exclusive: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', noop, {exclusive: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', noop, {exclusive: true, type: 'after'}), 'string');
	t.type(validate('afterEach', noop, {exclusive: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate only allows always on `after` and `afterEach`', function (t) {
	t.type(validate('before', noop, {always: true, type: 'test'}), 'string');
	t.type(validate('before', noop, {always: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', noop, {always: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', noop, {always: true, type: 'after'}), 'null');
	t.type(validate('afterEach', noop, {always: true, type: 'afterEach'}), 'null');
	t.end();
});

test('validate rejects skipping failing tests', function (t) {
	t.type(validate('before', noop, {failing: true, skipped: true, type: 'test'}), 'string');
	t.end();
});
