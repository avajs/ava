'use strict';
var test = require('tap').test;
var assert = require('../lib/assert');

test('.pass()', function (t) {
	t.notThrow(function () {
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

	t.notThrow(function () {
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

	t.notThrow(function () {
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

	t.notThrow(function () {
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

	t.notThrow(function () {
		assert.false(false);
	});

	t.end();
});

test('.is()', function (t) {
	t.notThrow(function () {
		assert.is('foo', 'foo');
	});

	t.throws(function () {
		assert.is('foo', 'bar');
	});

	t.end();
});

test('.not()', function (t) {
	t.notThrow(function () {
		assert.not('foo', 'bar');
	});

	t.throws(function () {
		assert.not('foo', 'foo');
	});

	t.end();
});

test('.same()', function (t) {
	t.notThrow(function () {
		assert.same({a: 'a'}, {a: 'a'});
	});

	t.notThrow(function () {
		assert.same(['a', 'b'], ['a', 'b']);
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

	t.end();
});

test('.notSame()', function (t) {
	t.notThrow(function () {
		assert.notSame({a: 'a'}, {a: 'b'});
	});

	t.notThrow(function () {
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

	t.notThrow(function () {
		assert.throws(function () {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.notThrow()', function (t) {
	t.notThrow(function () {
		assert.notThrow(function () {});
	});

	t.throws(function () {
		assert.notThrow(function () {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.regex()', function (t) {
	t.notThrow(function () {
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

	t.notThrow(function () {
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

	t.notThrow(function () {
		assert.same(a, b);
	});

	t.end();
});
