'use strict';
const test = require('tap').test;
const React = require('react');
const sinon = require('sinon');
const assert = require('../lib/assert');

test('.pass()', t => {
	t.doesNotThrow(() => {
		assert.pass();
	});

	t.end();
});

test('.fail()', t => {
	t.throws(() => {
		assert.fail();
	});

	t.end();
});

test('.truthy()', t => {
	t.throws(() => {
		assert.truthy(0);
		assert.truthy(false);
	});

	t.doesNotThrow(() => {
		assert.truthy(1);
		assert.truthy(true);
	});

	t.end();
});

test('.falsy()', t => {
	t.throws(() => {
		assert.falsy(1);
		assert.falsy(true);
	});

	t.doesNotThrow(() => {
		assert.falsy(0);
		assert.falsy(false);
	});

	t.end();
});

test('.true()', t => {
	t.throws(() => {
		assert.true(1);
	});

	t.throws(() => {
		assert.true(0);
	});

	t.throws(() => {
		assert.true(false);
	});

	t.throws(() => {
		assert.true('foo');
	});

	t.doesNotThrow(() => {
		assert.true(true);
	});

	t.end();
});

test('.false()', t => {
	t.throws(() => {
		assert.false(0);
	});

	t.throws(() => {
		assert.false(1);
	});

	t.throws(() => {
		assert.false(true);
	});

	t.throws(() => {
		assert.false('foo');
	});

	t.doesNotThrow(() => {
		assert.false(false);
	});

	t.end();
});

test('.is()', t => {
	t.doesNotThrow(() => {
		assert.is('foo', 'foo');
	});

	t.throws(() => {
		assert.is('foo', 'bar');
	});

	t.end();
});

test('.not()', t => {
	t.doesNotThrow(() => {
		assert.not('foo', 'bar');
	});

	t.throws(() => {
		assert.not('foo', 'foo');
	});

	t.end();
});

test('.deepEqual()', t => {
	// Tests starting here are to detect regressions in the underlying libraries
	// used to test deep object equality

	t.throws(() => {
		assert.deepEqual({a: false}, {a: 0});
	});

	t.doesNotThrow(() => {
		assert.deepEqual({
			a: 'a',
			b: 'b'
		}, {
			b: 'b',
			a: 'a'
		});
	});

	t.doesNotThrow(() => {
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

	t.throws(() => {
		assert.deepEqual([1, 2, 3], [1, 2, 3, 4]);
	});

	t.doesNotThrow(() => {
		assert.deepEqual([1, 2, 3], [1, 2, 3]);
	});

	t.throws(() => {
		const fnA = a => a;
		const fnB = a => a;
		assert.deepEqual(fnA, fnB);
	});

	t.doesNotThrow(() => {
		const x1 = {z: 4};
		const y1 = {x: x1};
		x1.y = y1;

		const x2 = {z: 4};
		const y2 = {x: x2};
		x2.y = y2;

		assert.deepEqual(x1, x2);
	});

	t.doesNotThrow(() => {
		function Foo(a) {
			this.a = a;
		}

		const x = new Foo(1);
		const y = new Foo(1);

		assert.deepEqual(x, y);
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

		assert.deepEqual(x, y);
	});

	t.throws(() => {
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

	t.throws(() => {
		assert.deepEqual({}, []);
	});

	t.throws(() => {
		assert.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	t.throws(() => {
		assert.deepEqual({a: 1}, {a: 1, b: undefined});
	});

	t.throws(() => {
		assert.deepEqual(new Date('1972-08-01'), null);
	});

	t.throws(() => {
		assert.deepEqual(new Date('1972-08-01'), undefined);
	});

	t.doesNotThrow(() => {
		assert.deepEqual(new Date('1972-08-01'), new Date('1972-08-01'));
	});

	t.doesNotThrow(() => {
		assert.deepEqual({x: new Date('1972-08-01')}, {x: new Date('1972-08-01')});
	});

	t.throws(() => {
		assert.deepEqual(() => {}, () => {});
	});

	t.doesNotThrow(() => {
		assert.deepEqual(undefined, undefined);
		assert.deepEqual({x: undefined}, {x: undefined});
		assert.deepEqual({x: [undefined]}, {x: [undefined]});
	});

	t.doesNotThrow(() => {
		assert.deepEqual(null, null);
		assert.deepEqual({x: null}, {x: null});
		assert.deepEqual({x: [null]}, {x: [null]});
	});

	t.doesNotThrow(() => {
		assert.deepEqual(0, 0);
		assert.deepEqual(1, 1);
		assert.deepEqual(3.14, 3.14);
	});

	t.throws(() => {
		assert.deepEqual(0, 1);
	});

	t.throws(() => {
		assert.deepEqual(1, -1);
	});

	t.throws(() => {
		assert.deepEqual(3.14, 2.72);
	});

	t.throws(() => {
		assert.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	t.doesNotThrow(() => {
		assert.deepEqual(
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
		assert.deepEqual(
			{x: {a: 1, b: 2}, y: {c: 3, d: 4}},
			{y: {d: 4, c: 3}, x: {b: 2, a: 1}}
		);
	});

	// Regression test end here

	t.doesNotThrow(() => {
		assert.deepEqual({a: 'a'}, {a: 'a'});
	});

	t.doesNotThrow(() => {
		assert.deepEqual(['a', 'b'], ['a', 'b']);
	});

	t.throws(() => {
		assert.deepEqual({a: 'a'}, {a: 'b'});
	});

	t.throws(() => {
		assert.deepEqual(['a', 'b'], ['a', 'a']);
	});

	t.throws(() => {
		assert.deepEqual([['a', 'b'], 'c'], [['a', 'b'], 'd']);
	});
	// NOTE: error's message is empty due to lib/assert.js:22
	// }, / 'c' ].*? 'd' ]/);

	t.throws(() => {
		const circular = ['a', 'b'];
		circular.push(circular);
		assert.deepEqual([circular, 'c'], [circular, 'd']);
	});
	// NOTE: error's message is empty due to lib/assert.js:22
	// }, / 'c' ].*? 'd' ]/);

	t.end();
});

test('.notDeepEqual()', t => {
	t.doesNotThrow(() => {
		assert.notDeepEqual({a: 'a'}, {a: 'b'});
	});

	t.doesNotThrow(() => {
		assert.notDeepEqual(['a', 'b'], ['c', 'd']);
	});

	t.throws(() => {
		assert.notDeepEqual({a: 'a'}, {a: 'a'});
	});

	t.throws(() => {
		assert.notDeepEqual(['a', 'b'], ['a', 'b']);
	});

	t.end();
});

test('.throws()', t => {
	t.throws(() => {
		assert.throws(() => {});
	});

	t.doesNotThrow(() => {
		assert.throws(() => {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.throws() returns the thrown error', t => {
	const expected = new Error();
	const actual = assert.throws(() => {
		throw expected;
	});

	t.is(actual, expected);

	t.end();
});

test('.throws() returns the rejection reason of promise', t => {
	const expected = new Error();

	return assert.throws(Promise.reject(expected)).then(actual => {
		t.is(actual, expected);
		t.end();
	});
});

test('.throws should throw if passed a bad value', t => {
	t.plan(1);

	t.throws(() => {
		assert.throws('not a function');
	}, {
		name: 'TypeError',
		message: /t\.throws must be called with a function, Promise, or Observable/
	});
});

test('.notThrows should throw if passed a bad value', t => {
	t.plan(1);

	t.throws(() => {
		assert.notThrows('not a function');
	}, {
		name: 'TypeError',
		message: /t\.notThrows must be called with a function, Promise, or Observable/
	});
});

test('.notThrows()', t => {
	t.doesNotThrow(() => {
		assert.notThrows(() => {});
	});

	t.throws(() => {
		assert.notThrows(() => {
			throw new Error('foo');
		});
	});

	t.end();
});

test('.regex()', t => {
	t.doesNotThrow(() => {
		assert.regex('abc', /^abc$/);
	});

	t.throws(() => {
		assert.regex('foo', /^abc$/);
	});

	t.end();
});

test('.notRegex()', t => {
	t.doesNotThrow(() => {
		assert.notRegex('abc', /def/);
	});

	t.throws(() => {
		assert.notRegex('abc', /abc/);
	});

	t.end();
});

test('.ifError()', t => {
	t.throws(() => {
		assert.ifError(new Error());
	});

	t.doesNotThrow(() => {
		assert.ifError(null);
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
		assert.notDeepEqual(a, b);
	});

	t.doesNotThrow(() => {
		assert.deepEqual(a, b);
	});

	t.end();
});

test('.jsxEqual()', t => {
	t.throws(() => {
		assert.jsxEqual(React.createElement('b', null), React.createElement('i', null));
	});

	t.doesNotThrow(() => {
		assert.jsxEqual(React.createElement('b', null), React.createElement('b', null));
	});

	t.end();
});

test('.notJsxEqual()', t => {
	t.throws(() => {
		assert.notJsxEqual(React.createElement('b', null), React.createElement('b', null));
	});

	t.doesNotThrow(() => {
		assert.notJsxEqual(React.createElement('b', null), React.createElement('i', null));
	});

	t.end();
});

test('snapshot makes a snapshot using a library and global options', t => {
	const saveSpy = sinon.spy();
	const state = {save: saveSpy};
	const stateGetter = sinon.stub().returns(state);
	const matchStub = sinon.stub().returns({pass: true});

	assert.title = 'Test name';

	t.plan(4);

	t.doesNotThrow(() => {
		assert._snapshot('tree', undefined, matchStub, stateGetter);
	});

	t.ok(stateGetter.called);

	t.match(matchStub.firstCall.thisValue, {
		currentTestName: 'Test name',
		snapshotState: state
	});

	t.ok(saveSpy.calledOnce);

	delete assert.title;

	t.end();
});
