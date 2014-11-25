'use strict';
var test = require('../');
var ava = require('../lib/test');

test('run test', function (t) {
	ava('foo', function (a) {
		a.true(false);
		a.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('test title is optional', function (t) {
	ava(function (a) {
		a.end();
	}).run(function () {
		t.is(this.title, '[anonymous]');
		t.end();
	});
});

test('infer test name from function', function (t) {
	ava(function foo(a) {
		a.end();
	}).run(function () {
		t.is(this.title, 'foo');
		t.end();
	});
});

test('multiple asserts', function (t) {
	ava(function (a) {
		a.true(true);
		a.true(true);
		a.true(true);
		a.end();
	}).run(function () {
		t.is(this._assertCount, 3);
		t.end();
	});
});

test('plan assertions', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
	}).run(function () {
		t.is(this._planCount, 2);
		t.is(this._assertCount, 2);
		t.end();
	});
});

test('run more assertions than planned', function (t) {
	ava(function (a) {
		a.plan(2);
		a.true(true);
		a.true(true);
		a.true(true);
	}).run(function (err) {
		t.true(err);
		t.is(err.name, 'AssertionError');
		t.end();
	});
});

test('handle non-assertion errors', function (t) {
	ava(function () {
		throw new Error();
	}).run(function (err) {
		t.is(err.name, 'AssertionError');
		t.true(err.actual instanceof Error);
		t.end();
	});
});

test('handle testing of arrays', function (t) {
	ava(function (a) {
		a.same(['foo', 'bar'], ['foo', 'bar']);
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy testing of arrays', function (t) {
	ava(function (a) {
		a.notSame(['foo', 'bar'], ['foo', 'bar', 'cat']);
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle testing of objects', function (t) {
	ava(function (a) {
		a.same({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar'});
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy testing of objects', function (t) {
	ava(function (a) {
		a.notSame({foo: 'foo', bar: 'bar'}, {foo: 'foo', bar: 'bar', cat: 'cake'});
		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle throws', function (t) {
	ava(function (a) {
		a.throws(function () {
			throw new Error('foo');
		});

		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle throws with error', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			throw new Error('foo');
		});

		a.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('handle falsy throws', function (t) {
	ava(function (a) {
		a.doesNotThrow(function () {
			return;
		});

		a.end();
	}).run(function (err) {
		t.false(err);
		t.end();
	});
});

test('handle falsy throws with error', function (t) {
	ava(function (a) {
		a.throws(function () {
			return;
		});

		a.end();
	}).run(function (err) {
		t.true(err);
		t.end();
	});
});

test('run functions after last planned assertion', function (t) {
	var i = 0;

	ava('foo', function (a) {
		a.plan(1);
		a.true(true);
		i++;
	}).run(function () {
		t.is(i, 1);
		t.end();
	});
});

test('run async functions after last planned assertion', function (t) {
	var i = 0;

	ava('foo', function (a) {
		a.plan(1);

		function foo(cb) {
			a.true(true);
			cb();
		}

		foo(function () {
			i++;
		});
	}).run(function () {
		t.is(i, 1);
		t.end();
	});
});
