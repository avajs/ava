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
	// Tests starting here are to detect regressions in the underlying libraries
	// used to test deep object equality

	t.throws(function () {
		assert.deepEqual({a: false}, {a: 0});
	});

	t.doesNotThrow(function () {
		assert.deepEqual({
			a: 'a',
			b: 'b'
		}, {
			b: 'b',
			a: 'a'
		});
	});

	t.doesNotThrow(function () {
		assert.deepEqual({
			a: 'a',
			b: 'b',
			c: {
				d: 'd'
			}
		}, {
			c: {
				d: 'd'
			},
			b: 'b',
			a: 'a'
		});
	});

	t.throws(function () {
		assert.deepEqual([1, 2, 3], [1, 2, 3, 4]);
	});

	t.doesNotThrow(function () {
		assert.deepEqual([1, 2, 3], [1, 2, 3]);
	});

	t.throws(function () {
		assert.deepEqual([1, 2, 3], [1, 2, 3, 4]);
	});

	t.throws(function () {
		var fnA = function (a) {
			return a;
		};
		var fnB = function (a) {
			return a;
		};

		assert.deepEqual(fnA, fnB);
	});

	t.doesNotThrow(function () {
		var x1 = {z: 4};
		var y1 = {x: x1};
		x1.y = y1;

		var x2 = {z: 4};
		var y2 = {x: x2};
		x2.y = y2;

		assert.deepEqual(x1, x2);
	});

	t.doesNotThrow(function () {
		function Foo(a) {
			this.a = a;
		}

		var x = new Foo(1);
		var y = new Foo(1);

		assert.deepEqual(x, y);
	});

	t.doesNotThrow(function () {
		function Foo(a) {
			this.a = a;
		}

		function Bar(a) {
			this.a = a;
		}

		var x = new Foo(1);
		var y = new Bar(1);

		assert.deepEqual(x, y);
	});

	t.throws(function () {
		assert.deepEqual({
			a: 'a',
			b: 'b',
			c: {
				d: false
			}
		}, {
			c: {
				d: 0
			},
			b: 'b',
			a: 'a'
		});
	});

	t.throws(function () {
		assert.deepEqual({}, []);
	});

	t.throws(function () {
		assert.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	// Regression test end here

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

test('.throws should throw if passed a bad value', function (t) {
	t.plan(1);

	t.throws(function () {
		assert.throws('not a function');
	}, {
		name: 'TypeError',
		message: /t\.throws must be called with a function, Promise, or Observable/
	});
});

test('.notThrows should throw if passed a bad value', function (t) {
	t.plan(1);

	t.throws(function () {
		assert.notThrows('not a function');
	}, {
		name: 'TypeError',
		message: /t\.notThrows must be called with a function, Promise, or Observable/
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

test('.notRegex()', function (t) {
	t.doesNotThrow(function () {
		assert.notRegex('abc', /def/);
	});

	t.throws(function () {
		assert.notRegex('abc', /abc/);
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
