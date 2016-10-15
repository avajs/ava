'use strict';

var test = require('tap').test;
var validate = require('../lib/validate-test');

var noop = function () {};

test('validate accepts basic test', function (t) {
	t.type(validate('basic test', noop, {type: 'test'}), 'null');
	t.end();
});

test('validate rejects tests without implementations except `todo` tests', function (t) {
	var errorMessage = 'Expected an implementation. Use `test.todo()` for tests without an implementation.';

	t.deepEquals(validate('test', null, {type: 'test'}), errorMessage);
	t.deepEquals(validate('before', null, {type: 'before'}), errorMessage);
	t.deepEquals(validate('beforeEach', null, {type: 'beforeEach'}), errorMessage);
	t.deepEquals(validate('after', null, {type: 'after'}), errorMessage);
	t.deepEquals(validate('afterEach', null, {type: 'afterEach'}), errorMessage);
	t.end();
});

test('validate accepts proper todo', function (t) {
	t.type(validate('proper todo', null, {todo: true, type: 'test'}), 'null');
	t.end();
});

test('validate rejects todo with function', function (t) {
	var errorMessage = '`todo` tests are not allowed to have an implementation. Use ' +
	'`test.skip()` for tests with an implementation.';

	t.deepEquals(validate('todo with function', noop, {todo: true, type: 'test'}), errorMessage);
	t.end();
});

test('validate rejects todo without title', function (t) {
	var errorMessage = '`todo` tests require a title';

	t.deepEquals(validate(null, null, {todo: true, type: 'test'}), errorMessage);
	t.end();
});

test('validate rejects todo with failing, skipped, or exclusive', function (t) {
	var errorMessage = '`todo` tests are just for documentation and cannot be used with skip, only, or failing';

	t.deepEquals(validate('failing', null, {todo: true, failing: true, type: 'test'}), errorMessage);
	t.deepEquals(validate('skipped', null, {todo: true, skipped: true, type: 'test'}), errorMessage);
	t.deepEquals(validate('exclusive', null, {todo: true, exclusive: true, type: 'test'}), errorMessage);
	t.end();
});

test('validate rejects todo when it\'s not a test', function (t) {
	var errorMessage = '`todo` is only for documentation of future tests and cannot be used with hooks';

	t.deepEquals(validate('before', null, {todo: true, type: 'before'}), errorMessage);
	t.deepEquals(validate('beforeEach', null, {todo: true, type: 'beforeEach'}), errorMessage);
	t.deepEquals(validate('after', null, {todo: true, type: 'after'}), errorMessage);
	t.deepEquals(validate('afterEach', null, {todo: true, type: 'afterEach'}), errorMessage);
	t.end();
});

test('validate rejects skipped exclusive', function (t) {
	var errorMessage = '`only` tests cannot be skipped';

	t.deepEquals(validate('skipped exclusive', noop, {exclusive: true, skipped: true, type: 'test'}), errorMessage);
	t.end();
});

test('validate rejects failing on non-tests', function (t) {
	var errorMessage = '`failing` is only for tests and cannot be used with hooks';

	t.type(validate('before', noop, {failing: true, type: 'test'}), 'null');
	t.deepEquals(validate('before', noop, {failing: true, type: 'before'}), errorMessage);
	t.deepEquals(validate('beforeEach', noop, {failing: true, type: 'beforeEach'}), errorMessage);
	t.deepEquals(validate('after', noop, {failing: true, type: 'after'}), errorMessage);
	t.deepEquals(validate('afterEach', noop, {failing: true, type: 'afterEach'}), errorMessage);
	t.end();
});

test('validate rejects skip on non-tests', function (t) {
	var errorMessage = '`only` is only for tests and cannot be used with hooks';

	t.type(validate('before', noop, {exclusive: true, type: 'test'}), 'null');
	t.deepEquals(validate('before', noop, {exclusive: true, type: 'before'}), errorMessage);
	t.deepEquals(validate('beforeEach', noop, {exclusive: true, type: 'beforeEach'}), errorMessage);
	t.deepEquals(validate('after', noop, {exclusive: true, type: 'after'}), errorMessage);
	t.deepEquals(validate('afterEach', noop, {exclusive: true, type: 'afterEach'}), errorMessage);
	t.end();
});

test('validate only allows always on `after` and `afterEach`', function (t) {
	var errorMessage = '`always` can only be used with `after` and `afterEach`';

	t.deepEquals(validate('before', noop, {always: true, type: 'test'}), errorMessage);
	t.deepEquals(validate('before', noop, {always: true, type: 'before'}), errorMessage);
	t.deepEquals(validate('beforeEach', noop, {always: true, type: 'beforeEach'}), errorMessage);
	t.type(validate('after', noop, {always: true, type: 'after'}), 'null');
	t.type(validate('afterEach', noop, {always: true, type: 'afterEach'}), 'null');
	t.end();
});

test('validate accepts skipping failing tests', function (t) {
	t.deepEquals(validate('before', noop, {failing: true, skipped: true, type: 'test'}), null);
	t.end();
});
