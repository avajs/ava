'use strict';
var test = require('tap').test;
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

test('.ok()', function (t) {
	t.throws(function () {
		assert.ok(0);
		assert.ok(false);
	});

	t.doesNotThrow(function () {
		assert.ok(1);
		assert.ok(true);
	});

	t.end();
});

test('.notOk()', function (t) {
	t.throws(function () {
		assert.notOk(1);
		assert.notOk(true);
	});

	t.doesNotThrow(function () {
		assert.notOk(0);
		assert.notOk(false);
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

test('.same()', function (t) {
	t.doesNotThrow(function () {
		assert.same({a: 'a'}, {a: 'a'});
	});

	t.doesNotThrow(function () {
		assert.same(['a', 'b'], ['a', 'b']);
	});

	t.doesNotThrow(function () {
		assert.same(new Set([1, 2, 3]), new Set([1, 2, 3]));
	});

	t.doesNotThrow(function () {
		assert.same(new Map([[1, 'one'], [2, 'two']]), new Map([[1, 'one'], [2, 'two']]));
	});

	t.throws(function () {
		assert.same({a: 'a'}, {a: 'b'});
	});

	t.throws(function () {
		assert.same(['a', 'b'], ['a', 'a']);
	});

	t.throws(function () {
		assert.same([['a', 'b'], 'c'], [['a', 'b'], 'd']);
	}, / 'c' ].*? 'd' ]/);

	t.throws(function () {
		var circular = ['a', 'b'];
		circular.push(circular);
		assert.same([circular, 'c'], [circular, 'd']);
	}, / 'c' ].*? 'd' ]/);

	t.throws(function () {
		assert.same(new Set([1, 2, 3]), new Set([1, 2]));
	});

	t.throws(function () {
		assert.same(new Map([[1, 'one'], [2, 'two']]), new Map([[1, 'one'], [3, 'three']]));
	});

	t.end();
});

test('.notSame()', function (t) {
	t.doesNotThrow(function () {
		assert.notSame({a: 'a'}, {a: 'b'});
	});

	t.doesNotThrow(function () {
		assert.notSame(['a', 'b'], ['c', 'd']);
	});

	t.throws(function () {
		assert.notSame({a: 'a'}, {a: 'a'});
	});

	t.throws(function () {
		assert.notSame(['a', 'b'], ['a', 'b']);
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

test('.doesNotThrow()', function (t) {
	t.doesNotThrow(function () {
		assert.doesNotThrow(function () {});
	});

	t.throws(function () {
		assert.doesNotThrow(function () {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.regexTest()', function (t) {
	t.doesNotThrow(function () {
		assert.regexTest(/^abc$/, 'abc');
	});

	t.throws(function () {
		assert.regexTest(/^abc$/, 'foo');
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

test('.same() should not mask RangeError from underlying assert', function (t) {
	var Circular = function () {
		this.test = this;
	};

	var a = new Circular();
	var b = new Circular();

	t.throws(function () {
		assert.notSame(a, b);
	});

	t.doesNotThrow(function () {
		assert.same(a, b);
	});

	t.end();
});
