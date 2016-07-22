'use strict';

var test = require('tap').test;
var validate = require('../lib/validate-test');

var noop = function () {};

test('validate accepts basic test', function (t) {
	t.assert(validate('basic test', noop, {type: 'test'}) === null);
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

test('validate rejects skipping non-tests', function (t) {
	t.type(validate('before', null, {skipped: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {skipped: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {skipped: true, type: 'after'}), 'string');
	t.type(validate('afterEach', null, {skipped: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate rejects failing on non-tests', function (t) {
	t.type(validate('before', null, {failing: true, type: 'test'}), 'null');
	t.type(validate('before', null, {failing: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {failing: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {failing: true, type: 'after'}), 'string');
	t.type(validate('afterEach', null, {failing: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate rejects failing on non-tests', function (t) {
	t.type(validate('before', null, {exclusive: true, type: 'test'}), 'null');
	t.type(validate('before', null, {exclusive: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {exclusive: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {exclusive: true, type: 'after'}), 'string');
	t.type(validate('afterEach', null, {exclusive: true, type: 'afterEach'}), 'string');
	t.end();
});

test('validate only allows always on `after` and `afterEach`', function (t) {
	t.type(validate('before', null, {always: true, type: 'test'}), 'string');
	t.type(validate('before', null, {always: true, type: 'before'}), 'string');
	t.type(validate('beforeEach', null, {always: true, type: 'beforeEach'}), 'string');
	t.type(validate('after', null, {always: true, type: 'after'}), 'null');
	t.type(validate('afterEach', null, {always: true, type: 'afterEach'}), 'null');
	t.end();
});

test('validate rejects skipping failing tests', function (t) {
	t.type(validate('before', null, {failing: true, skipped: true, type: 'test'}), 'string');
	t.end();
});
