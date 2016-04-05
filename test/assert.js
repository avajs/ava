'use strict';
var test = require('tap').test;
var Promise = require('bluebird');
var assert = require('../lib/assert');

test('.pass()', function (t) {
	t.doesNotThrow(function () {
		assert.pass();
	});

	t.end();
});

test('.fail()', function (t) {
	t.throws(function () {
		assert.fail();
	});

	t.end();
});

test('.truthy()', function (t) {
	t.throws(function () {
		assert.truthy(0);
		assert.truthy(false);
	});

	t.doesNotThrow(function () {
		assert.truthy(1);
		assert.truthy(true);
	});

	t.end();
});

test('.falsy()', function (t) {
	t.throws(function () {
		assert.falsy(1);
		assert.falsy(true);
	});

	t.doesNotThrow(function () {
		assert.falsy(0);
		assert.falsy(false);
	});

	t.end();
});

test('.true()', function (t) {
	t.throws(function () {
		assert.true(1);
	});

	t.throws(function () {
		assert.true(0);
	});

	t.throws(function () {
		assert.true(false);
	});

	t.throws(function () {
		assert.true('foo');
	});

	t.doesNotThrow(function () {
		assert.true(true);
	});

	t.end();
});

test('.false()', function (t) {
	t.throws(function () {
		assert.false(0);
	});

	t.throws(function () {
		assert.false(1);
	});

	t.throws(function () {
		assert.false(true);
	});

	t.throws(function () {
		assert.false('foo');
	});

	t.doesNotThrow(function () {
		assert.false(false);
	});

	t.end();
});

test('.is()', function (t) {
	t.doesNotThrow(function () {
		assert.is('foo', 'foo');
	});

	t.throws(function () {
		assert.is('foo', 'bar');
	});

	t.end();
});

test('.not()', function (t) {
	t.doesNotThrow(function () {
		assert.not('foo', 'bar');
	});

	t.throws(function () {
		assert.not('foo', 'foo');
	});

	t.end();
});

test('.deepEqual()', function (t) {
	t.doesNotThrow(function () {
		assert.deepEqual({a: 'a'}, {a: 'a'});
	});

	t.doesNotThrow(function () {
		assert.deepEqual(['a', 'b'], ['a', 'b']);
	});

	t.throws(function () {
		assert.deepEqual({a: 'a'}, {a: 'b'});
	});

	t.throws(function () {
		assert.deepEqual(['a', 'b'], ['a', 'a']);
	});

	t.throws(function () {
		assert.deepEqual([['a', 'b'], 'c'], [['a', 'b'], 'd']);
	}, / 'c' ].*? 'd' ]/);

	t.throws(function () {
		var circular = ['a', 'b'];
		circular.push(circular);
		assert.deepEqual([circular, 'c'], [circular, 'd']);
	}, / 'c' ].*? 'd' ]/);

	t.end();
});

test('.notDeepEqual()', function (t) {
	t.doesNotThrow(function () {
		assert.notDeepEqual({a: 'a'}, {a: 'b'});
	});

	t.doesNotThrow(function () {
		assert.notDeepEqual(['a', 'b'], ['c', 'd']);
	});

	t.throws(function () {
		assert.notDeepEqual({a: 'a'}, {a: 'a'});
	});

	t.throws(function () {
		assert.notDeepEqual(['a', 'b'], ['a', 'b']);
	});

	t.end();
});

test('.throws()', function (t) {
	t.throws(function () {
		assert.throws(function () {});
	});

	t.doesNotThrow(function () {
		assert.throws(function () {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.throws() returns the thrown error', function (t) {
	var expected = new Error();
	var actual = assert.throws(function () {
		throw expected;
	});

	t.is(actual, expected);

	t.end();
});

test('.throws() returns the rejection reason of promise', function (t) {
	var expected = new Error();

	assert.throws(Promise.reject(expected)).then(function (actual) {
		t.is(actual, expected);
		t.end();
	});
});

test('.notThrows()', function (t) {
	t.doesNotThrow(function () {
		assert.notThrows(function () {});
	});

	t.throws(function () {
		assert.notThrows(function () {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.doesNotThrow() alias for .notThrows()', function (t) {
	process.noDeprecation = true;

	t.doesNotThrow(function () {
		assert.doesNotThrow(function () {});
	});

	t.throws(function () {
		assert.doesNotThrow(function () {
			throw new Error('foo');
		});
	});

	process.noDeprecation = false;

	t.end();
});

test('.regex()', function (t) {
	t.doesNotThrow(function () {
		assert.regex('abc', /^abc$/);
	});

	t.throws(function () {
		assert.regex('foo', /^abc$/);
	});

	t.end();
});

test('.ifError()', function (t) {
	t.throws(function () {
		assert.ifError(new Error());
	});

	t.doesNotThrow(function () {
		assert.ifError(null);
	});

	t.end();
});

test('.deepEqual() should not mask RangeError from underlying assert', function (t) {
	var Circular = function () {
		this.test = this;
	};

	var a = new Circular();
	var b = new Circular();

	t.throws(function () {
		assert.notDeepEqual(a, b);
	});

	t.doesNotThrow(function () {
		assert.deepEqual(a, b);
	});

	t.end();
});
