'use strict';
const test = require('tap').test;
const sinon = require('sinon');
const assert = require('../lib/assert');

const assertions = assert.wrapAssertions({
	pass() {},

	pending() {},

	fail(_, error) {
		throw error;
	}
});

test('.pass()', t => {
	t.doesNotThrow(() => {
		assertions.pass();
	});

	t.end();
});

test('.fail()', t => {
	t.throws(() => {
		assertions.fail();
	});

	t.end();
});

test('.truthy()', t => {
	t.throws(() => {
		assertions.truthy(0);
		assertions.truthy(false);
	});

	t.doesNotThrow(() => {
		assertions.truthy(1);
		assertions.truthy(true);
	});

	t.end();
});

test('.falsy()', t => {
	t.throws(() => {
		assertions.falsy(1);
		assertions.falsy(true);
	});

	t.doesNotThrow(() => {
		assertions.falsy(0);
		assertions.falsy(false);
	});

	t.end();
});

test('.true()', t => {
	t.throws(() => {
		assertions.true(1);
	});

	t.throws(() => {
		assertions.true(0);
	});

	t.throws(() => {
		assertions.true(false);
	});

	t.throws(() => {
		assertions.true('foo');
	});

	t.doesNotThrow(() => {
		assertions.true(true);
	});

	t.end();
});

test('.false()', t => {
	t.throws(() => {
		assertions.false(0);
	});

	t.throws(() => {
		assertions.false(1);
	});

	t.throws(() => {
		assertions.false(true);
	});

	t.throws(() => {
		assertions.false('foo');
	});

	t.doesNotThrow(() => {
		assertions.false(false);
	});

	t.end();
});

test('.is()', t => {
	t.doesNotThrow(() => {
		assertions.is('foo', 'foo');
	});

	t.throws(() => {
		assertions.is('foo', 'bar');
	});

	t.end();
});

test('.not()', t => {
	t.doesNotThrow(() => {
		assertions.not('foo', 'bar');
	});

	t.throws(() => {
		assertions.not('foo', 'foo');
	});

	t.end();
});

test('.deepEqual()', t => {
	// Tests starting here are to detect regressions in the underlying libraries
	// used to test deep object equality

	t.throws(() => {
		assertions.deepEqual({a: false}, {a: 0});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual({
			a: 'a',
			b: 'b'
		}, {
			b: 'b',
			a: 'a'
		});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual({
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

	t.throws(() => {
		assertions.deepEqual([1, 2, 3], [1, 2, 3, 4]);
	});

	t.doesNotThrow(() => {
		assertions.deepEqual([1, 2, 3], [1, 2, 3]);
	});

	t.throws(() => {
		const fnA = a => a;
		const fnB = a => a;
		assertions.deepEqual(fnA, fnB);
	});

	t.doesNotThrow(() => {
		const x1 = {z: 4};
		const y1 = {x: x1};
		x1.y = y1;

		const x2 = {z: 4};
		const y2 = {x: x2};
		x2.y = y2;

		assertions.deepEqual(x1, x2);
	});

	t.doesNotThrow(() => {
		function Foo(a) {
			this.a = a;
		}

		const x = new Foo(1);
		const y = new Foo(1);

		assertions.deepEqual(x, y);
	});

	t.throws(() => {
		function Foo(a) {
			this.a = a;
		}

		function Bar(a) {
			this.a = a;
		}

		const x = new Foo(1);
		const y = new Bar(1);

		assertions.deepEqual(x, y);
	});

	t.throws(() => {
		assertions.deepEqual({
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

	t.throws(() => {
		assertions.deepEqual({}, []);
	});

	t.throws(() => {
		assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	t.throws(() => {
		assertions.deepEqual({a: 1}, {a: 1, b: undefined});
	});

	t.throws(() => {
		assertions.deepEqual(new Date('1972-08-01'), null);
	});

	t.throws(() => {
		assertions.deepEqual(new Date('1972-08-01'), undefined);
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(new Date('1972-08-01'), new Date('1972-08-01'));
	});

	t.doesNotThrow(() => {
		assertions.deepEqual({x: new Date('1972-08-01')}, {x: new Date('1972-08-01')});
	});

	t.throws(() => {
		assertions.deepEqual(() => {}, () => {});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(undefined, undefined);
		assertions.deepEqual({x: undefined}, {x: undefined});
		assertions.deepEqual({x: [undefined]}, {x: [undefined]});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(null, null);
		assertions.deepEqual({x: null}, {x: null});
		assertions.deepEqual({x: [null]}, {x: [null]});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(0, 0);
		assertions.deepEqual(1, 1);
		assertions.deepEqual(3.14, 3.14);
	});

	t.throws(() => {
		assertions.deepEqual(0, 1);
	});

	t.throws(() => {
		assertions.deepEqual(1, -1);
	});

	t.throws(() => {
		assertions.deepEqual(3.14, 2.72);
	});

	t.throws(() => {
		assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(
			[
				{foo: {z: 100, y: 200, x: 300}},
				'bar',
				11,
				{baz: {d: 4, a: 1, b: 2, c: 3}}
			],
			[
				{foo: {x: 300, y: 200, z: 100}},
				'bar',
				11,
				{baz: {c: 3, b: 2, a: 1, d: 4}}
			]
		);
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(
			{x: {a: 1, b: 2}, y: {c: 3, d: 4}},
			{y: {d: 4, c: 3}, x: {b: 2, a: 1}}
		);
	});

	// Regression test end here

	t.doesNotThrow(() => {
		assertions.deepEqual({a: 'a'}, {a: 'a'});
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(['a', 'b'], ['a', 'b']);
	});

	t.throws(() => {
		assertions.deepEqual({a: 'a'}, {a: 'b'});
	});

	t.throws(() => {
		assertions.deepEqual(['a', 'b'], ['a', 'a']);
	});

	t.throws(() => {
		assertions.deepEqual([['a', 'b'], 'c'], [['a', 'b'], 'd']);
	});

	t.throws(() => {
		const circular = ['a', 'b'];
		circular.push(circular);
		assertions.deepEqual([circular, 'c'], [circular, 'd']);
	});

	t.end();
});

test('.notDeepEqual()', t => {
	t.doesNotThrow(() => {
		assertions.notDeepEqual({a: 'a'}, {a: 'b'});
	});

	t.doesNotThrow(() => {
		assertions.notDeepEqual(['a', 'b'], ['c', 'd']);
	});

	t.throws(() => {
		assertions.notDeepEqual({a: 'a'}, {a: 'a'});
	});

	t.throws(() => {
		assertions.notDeepEqual(['a', 'b'], ['a', 'b']);
	});

	t.end();
});

test('.throws()', t => {
	t.throws(() => {
		assertions.throws(() => {});
	});

	t.doesNotThrow(() => {
		assertions.throws(() => {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.throws() returns the thrown error', t => {
	const expected = new Error();
	const actual = assertions.throws(() => {
		throw expected;
	});

	t.is(actual, expected);

	t.end();
});

test('.throws() returns the rejection reason of promise', t => {
	const expected = new Error();

	return assertions.throws(Promise.reject(expected)).then(actual => {
		t.is(actual, expected);
		t.end();
	});
});

test('.throws should throw if passed a bad value', t => {
	t.plan(1);

	t.throws(() => {
		assertions.throws('not a function');
	}, {
		name: 'AssertionError',
		message: /`t\.throws\(\)` must be called with a function, Promise, or Observable/
	});
});

test('.notThrows should throw if passed a bad value', t => {
	t.plan(1);

	t.throws(() => {
		assertions.notThrows('not a function');
	}, {
		name: 'AssertionError',
		message: /`t\.notThrows\(\)` must be called with a function, Promise, or Observable/
	});
});

test('.notThrows()', t => {
	t.doesNotThrow(() => {
		assertions.notThrows(() => {});
	});

	t.throws(() => {
		assertions.notThrows(() => {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.notThrows() returns undefined for a fulfilled promise', t => {
	return assertions.notThrows(Promise.resolve(Symbol(''))).then(actual => {
		t.is(actual, undefined);
	});
});

test('.regex()', t => {
	t.doesNotThrow(() => {
		assertions.regex('abc', /^abc$/);
	});

	t.throws(() => {
		assertions.regex('foo', /^abc$/);
	});

	t.end();
});

test('.notRegex()', t => {
	t.doesNotThrow(() => {
		assertions.notRegex('abc', /def/);
	});

	t.throws(() => {
		assertions.notRegex('abc', /abc/);
	});

	t.end();
});

test('.ifError()', t => {
	t.throws(() => {
		assertions.ifError(new Error());
	});

	t.doesNotThrow(() => {
		assertions.ifError(null);
	});

	t.end();
});

test('.deepEqual() should not mask RangeError from underlying assert', t => {
	const Circular = function () {
		this.test = this;
	};

	const a = new Circular();
	const b = new Circular();

	t.throws(() => {
		assertions.notDeepEqual(a, b);
	});

	t.doesNotThrow(() => {
		assertions.deepEqual(a, b);
	});

	t.end();
});

test('snapshot makes a snapshot using a library and global options', t => {
	const saveSpy = sinon.spy();
	const state = {save: saveSpy};
	const stateGetter = sinon.stub().returns(state);
	const matchStub = sinon.stub().returns({pass: true});

	const test = {
		title: 'Test name'
	};

	t.plan(4);

	t.doesNotThrow(() => {
		assert.snapshot(test, 'tree', undefined, matchStub, stateGetter);
	});

	t.ok(stateGetter.called);

	t.match(matchStub.firstCall.thisValue, {
		currentTestName: 'Test name',
		snapshotState: state
	});

	t.ok(saveSpy.calledOnce);
	t.end();
});

test('snapshot handles jsx tree', t => {
	const saveSpy = sinon.spy();
	const state = {save: saveSpy};
	const stateGetter = sinon.stub().returns(state);
	const matchStub = sinon.stub().returns({pass: true});

	const test = {
		title: 'Test name'
	};

	t.plan(5);

	t.doesNotThrow(() => {
		const tree = {
			type: 'h1',
			children: ['Hello'],
			props: {}
		};

		Object.defineProperty(tree, '$$typeof', {value: Symbol.for('react.test.json')});

		assert.snapshot(test, tree, undefined, matchStub, stateGetter);
	});

	t.ok(stateGetter.called);

	const savedTree = JSON.parse(matchStub.firstCall.args[0]);
	t.deepEqual(savedTree, {
		__ava_react_jsx: { // eslint-disable-line camelcase
			type: 'h1',
			children: ['Hello'],
			props: {}
		}
	});

	t.match(matchStub.firstCall.thisValue, {
		currentTestName: 'Test name',
		snapshotState: state
	});

	t.ok(saveSpy.calledOnce);
	t.end();
});
