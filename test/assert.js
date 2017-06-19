'use strict';
require('../lib/globals').options.color = false;

const path = require('path');
const stripAnsi = require('strip-ansi');
const React = require('react');
const renderer = require('react-test-renderer');
const test = require('tap').test;
const assert = require('../lib/assert');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const HelloMessage = require('./fixture/HelloMessage');

let lastFailure = null;
let lastPassed = false;
const assertions = assert.wrapAssertions({
	pass() {
		lastPassed = true;
	},

	pending(_, promise) {
		promise.catch(err => {
			lastFailure = err;
		});
	},

	fail(_, error) {
		lastFailure = error;
	}
});

function assertFailure(t, subset) {
	if (!lastFailure) {
		t.fail('Expected assertion to fail');
		return;
	}

	t.is(lastFailure.assertion, subset.assertion);
	t.is(lastFailure.message, subset.message);
	t.is(lastFailure.name, 'AssertionError');
	t.is(lastFailure.operator, subset.operator);
	if (subset.statements) {
		t.is(lastFailure.statements.length, subset.statements.length);
		lastFailure.statements.forEach((s, i) => {
			t.is(s[0], subset.statements[i][0]);
			t.match(s[1], subset.statements[i][1]);
		});
	} else {
		t.same(lastFailure.statements, []);
	}
	if (subset.values) {
		t.is(lastFailure.values.length, subset.values.length);
		lastFailure.values.forEach((s, i) => {
			t.is(s.label, subset.values[i].label);
			t.match(stripAnsi(s.formatted), subset.values[i].formatted);
		});
	} else {
		t.same(lastFailure.values, []);
	}
}

function failsWith(t, fn, subset) {
	lastFailure = null;
	fn();
	assertFailure(t, subset);
}

function eventuallyFailsWith(t, promise, subset) {
	lastFailure = null;
	return promise.then(() => {
		assertFailure(t, subset);
	});
}

function fails(t, fn) {
	lastFailure = null;
	fn();
	if (lastFailure) {
		t.pass();
	} else {
		t.fail('Expected assertion to fail');
	}
}

function passes(t, fn) {
	lastPassed = false;
	fn();
	if (lastPassed) {
		t.pass();
	} else {
		t.fail('Expected assertion to pass');
	}
}

test('.pass()', t => {
	passes(t, () => {
		assertions.pass();
	});

	t.end();
});

test('.fail()', t => {
	failsWith(t, () => {
		assertions.fail();
	}, {
		assertion: 'fail',
		message: 'Test failed via `t.fail()`'
	});

	failsWith(t, () => {
		assertions.fail('my message');
	}, {
		assertion: 'fail',
		message: 'my message'
	});

	t.end();
});

test('.is()', t => {
	passes(t, () => {
		assertions.is('foo', 'foo');
	});

	passes(t, () => {
		assertions.is('', '');
	});

	passes(t, () => {
		assertions.is(true, true);
	});

	passes(t, () => {
		assertions.is(false, false);
	});

	passes(t, () => {
		assertions.is(null, null);
	});

	passes(t, () => {
		assertions.is(undefined, undefined);
	});

	passes(t, () => {
		assertions.is(1, 1);
	});

	passes(t, () => {
		assertions.is(0, 0);
	});

	passes(t, () => {
		assertions.is(-0, -0);
	});

	passes(t, () => {
		assertions.is(NaN, NaN);
	});

	passes(t, () => {
		assertions.is(0 / 0, NaN);
	});

	passes(t, () => {
		const someRef = {foo: 'bar'};
		assertions.is(someRef, someRef);
	});

	fails(t, () => {
		assertions.is(0, -0);
	});

	fails(t, () => {
		assertions.is(0, false);
	});

	fails(t, () => {
		assertions.is('', false);
	});

	fails(t, () => {
		assertions.is('0', 0);
	});

	fails(t, () => {
		assertions.is('17', 17);
	});

	fails(t, () => {
		assertions.is([1, 2], '1,2');
	});

	fails(t, () => {
		// eslint-disable-next-line no-new-wrappers
		assertions.is(new String('foo'), 'foo');
	});

	fails(t, () => {
		assertions.is(null, undefined);
	});

	fails(t, () => {
		assertions.is(null, false);
	});

	fails(t, () => {
		assertions.is(undefined, false);
	});

	fails(t, () => {
		assertions.is({foo: 'bar'}, {foo: 'bar'});
	});

	fails(t, () => {
		// eslint-disable-next-line no-new-wrappers
		assertions.is(new String('foo'), new String('foo'));
	});

	fails(t, () => {
		assertions.is(0, null);
	});

	fails(t, () => {
		assertions.is(0, NaN);
	});

	fails(t, () => {
		assertions.is('foo', NaN);
	});

	failsWith(t, () => {
		assertions.is('foo', 'bar');
	}, {
		assertion: 'is',
		message: '',
		values: [
			{label: 'Difference:', formatted: /- 'foo'\n\+ 'bar'/}
		]
	});

	failsWith(t, () => {
		assertions.is('foo', 42);
	}, {
		assertion: 'is',
		message: '',
		values: [
			{label: 'Difference:', formatted: /- 'foo'\n\+ 42/}
		]
	});

	failsWith(t, () => {
		assertions.is('foo', 42, 'my message');
	}, {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference:', formatted: /- 'foo'\n\+ 42/}
		]
	});

	failsWith(t, () => {
		assertions.is(0, -0, 'my message');
	}, {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference:', formatted: /- 0\n\+ -0/}
		]
	});

	failsWith(t, () => {
		assertions.is(-0, 0, 'my message');
	}, {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference:', formatted: /- -0\n\+ 0/}
		]
	});

	t.end();
});

test('.not()', t => {
	passes(t, () => {
		assertions.not('foo', 'bar');
	});

	fails(t, () => {
		assertions.not(NaN, NaN);
	});

	fails(t, () => {
		assertions.not(0 / 0, NaN);
	});

	failsWith(t, () => {
		assertions.not('foo', 'foo');
	}, {
		assertion: 'not',
		message: '',
		values: [{label: 'Value is the same as:', formatted: /foo/}]
	});

	failsWith(t, () => {
		assertions.not('foo', 'foo', 'my message');
	}, {
		assertion: 'not',
		message: 'my message',
		values: [{label: 'Value is the same as:', formatted: /foo/}]
	});

	t.end();
});

test('.deepEqual()', t => {
	// Tests starting here are to detect regressions in the underlying libraries
	// used to test deep object equality

	fails(t, () => {
		assertions.deepEqual({a: false}, {a: 0});
	});

	passes(t, () => {
		assertions.deepEqual({
			a: 'a',
			b: 'b'
		}, {
			b: 'b',
			a: 'a'
		});
	});

	passes(t, () => {
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

	fails(t, () => {
		assertions.deepEqual([1, 2, 3], [1, 2, 3, 4]);
	});

	passes(t, () => {
		assertions.deepEqual([1, 2, 3], [1, 2, 3]);
	});

	fails(t, () => {
		const fnA = a => a;
		const fnB = a => a;
		assertions.deepEqual(fnA, fnB);
	});

	passes(t, () => {
		const x1 = {z: 4};
		const y1 = {x: x1};
		x1.y = y1;

		const x2 = {z: 4};
		const y2 = {x: x2};
		x2.y = y2;

		assertions.deepEqual(x1, x2);
	});

	passes(t, () => {
		function Foo(a) {
			this.a = a;
		}

		const x = new Foo(1);
		const y = new Foo(1);

		assertions.deepEqual(x, y);
	});

	fails(t, () => {
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

	fails(t, () => {
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

	fails(t, () => {
		assertions.deepEqual({}, []);
	});

	fails(t, () => {
		assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	fails(t, () => {
		assertions.deepEqual({a: 1}, {a: 1, b: undefined});
	});

	fails(t, () => {
		assertions.deepEqual(new Date('1972-08-01'), null);
	});

	fails(t, () => {
		assertions.deepEqual(new Date('1972-08-01'), undefined);
	});

	passes(t, () => {
		assertions.deepEqual(new Date('1972-08-01'), new Date('1972-08-01'));
	});

	passes(t, () => {
		assertions.deepEqual({x: new Date('1972-08-01')}, {x: new Date('1972-08-01')});
	});

	fails(t, () => {
		assertions.deepEqual(() => {}, () => {});
	});

	passes(t, () => {
		assertions.deepEqual(undefined, undefined);
		assertions.deepEqual({x: undefined}, {x: undefined});
		assertions.deepEqual({x: [undefined]}, {x: [undefined]});
	});

	passes(t, () => {
		assertions.deepEqual(null, null);
		assertions.deepEqual({x: null}, {x: null});
		assertions.deepEqual({x: [null]}, {x: [null]});
	});

	passes(t, () => {
		assertions.deepEqual(0, 0);
		assertions.deepEqual(1, 1);
		assertions.deepEqual(3.14, 3.14);
	});

	fails(t, () => {
		assertions.deepEqual(0, 1);
	});

	fails(t, () => {
		assertions.deepEqual(1, -1);
	});

	fails(t, () => {
		assertions.deepEqual(3.14, 2.72);
	});

	fails(t, () => {
		assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']);
	});

	passes(t, () => {
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

	passes(t, () => {
		assertions.deepEqual(
			{x: {a: 1, b: 2}, y: {c: 3, d: 4}},
			{y: {d: 4, c: 3}, x: {b: 2, a: 1}}
		);
	});

	passes(t, () => {
		assertions.deepEqual(
			renderer.create(React.createElement(HelloMessage, {name: 'Sindre'})).toJSON(),
			React.createElement('div', null, 'Hello ', React.createElement('mark', null, 'Sindre')));
	});

	// Regression test end here

	passes(t, () => {
		assertions.deepEqual({a: 'a'}, {a: 'a'});
	});

	passes(t, () => {
		assertions.deepEqual(['a', 'b'], ['a', 'b']);
	});

	fails(t, () => {
		assertions.deepEqual({a: 'a'}, {a: 'b'});
	});

	fails(t, () => {
		assertions.deepEqual(['a', 'b'], ['a', 'a']);
	});

	fails(t, () => {
		assertions.deepEqual([['a', 'b'], 'c'], [['a', 'b'], 'd']);
	});

	fails(t, () => {
		const circular = ['a', 'b'];
		circular.push(circular);
		assertions.deepEqual([circular, 'c'], [circular, 'd']);
	});

	failsWith(t, () => {
		assertions.deepEqual('foo', 'bar');
	}, {
		assertion: 'deepEqual',
		message: '',
		values: [{label: 'Difference:', formatted: /- 'foo'\n\+ 'bar'/}]
	});

	failsWith(t, () => {
		assertions.deepEqual('foo', 42);
	}, {
		assertion: 'deepEqual',
		message: '',
		values: [{label: 'Difference:', formatted: /- 'foo'\n\+ 42/}]
	});

	failsWith(t, () => {
		assertions.deepEqual('foo', 42, 'my message');
	}, {
		assertion: 'deepEqual',
		message: 'my message',
		values: [{label: 'Difference:', formatted: /- 'foo'\n\+ 42/}]
	});

	t.end();
});

test('.notDeepEqual()', t => {
	passes(t, () => {
		assertions.notDeepEqual({a: 'a'}, {a: 'b'});
	});

	passes(t, () => {
		assertions.notDeepEqual(['a', 'b'], ['c', 'd']);
	});

	failsWith(t, () => {
		assertions.notDeepEqual({a: 'a'}, {a: 'a'});
	}, {
		assertion: 'notDeepEqual',
		message: '',
		values: [{label: 'Value is deeply equal:', formatted: /.*\{.*\n.*a: 'a'/}]
	});

	failsWith(t, () => {
		assertions.notDeepEqual(['a', 'b'], ['a', 'b'], 'my message');
	}, {
		assertion: 'notDeepEqual',
		message: 'my message',
		values: [{label: 'Value is deeply equal:', formatted: /.*\[.*\n.*'a',\n.*'b',/}]
	});

	t.end();
});

test('.throws()', t => {
	failsWith(t, () => {
		assertions.throws(() => {});
	}, {
		assertion: 'throws',
		message: '',
		values: []
	});

	failsWith(t, () => {
		assertions.throws(() => {}, Error, 'my message');
	}, {
		assertion: 'throws',
		message: 'my message',
		values: []
	});

	const err = new Error('foo');
	failsWith(t, () => {
		assertions.throws(() => {
			throw err;
		}, 'bar');
	}, {
		assertion: 'throws',
		message: '',
		values: [{label: 'Threw unexpected exception:', formatted: /foo/}]
	});

	passes(t, () => {
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

test('.throws() fails if passed a bad value', t => {
	failsWith(t, () => {
		assertions.throws('not a function');
	}, {
		assertion: 'throws',
		message: '`t.throws()` must be called with a function, Promise, or Observable',
		values: [{label: 'Called with:', formatted: /not a function/}]
	});

	t.end();
});

test('promise .throws() fails when promise is resolved', t => {
	return eventuallyFailsWith(t, assertions.throws(Promise.resolve('foo')), {
		assertion: 'throws',
		message: 'Expected promise to be rejected, but it was resolved instead',
		values: [{label: 'Resolved with:', formatted: /'foo'/}]
	});
});

test('.notThrows()', t => {
	passes(t, () => {
		assertions.notThrows(() => {});
	});

	failsWith(t, () => {
		assertions.notThrows(() => {
			throw new Error('foo');
		});
	}, {
		assertion: 'notThrows',
		message: '',
		values: [{label: 'Threw:', formatted: /foo/}]
	});

	failsWith(t, () => {
		assertions.notThrows(() => {
			throw new Error('foo');
		}, 'my message');
	}, {
		assertion: 'notThrows',
		message: 'my message',
		values: [{label: 'Threw:', formatted: /foo/}]
	});

	t.end();
});

test('.notThrows() returns undefined for a fulfilled promise', t => {
	return assertions.notThrows(Promise.resolve(Symbol(''))).then(actual => {
		t.is(actual, undefined);
	});
});

test('.notThrows() fails if passed a bad value', t => {
	failsWith(t, () => {
		assertions.notThrows('not a function');
	}, {
		assertion: 'notThrows',
		message: '`t.notThrows()` must be called with a function, Promise, or Observable',
		values: [{label: 'Called with:', formatted: /not a function/}]
	});

	t.end();
});

test('.ifError()', t => {
	fails(t, () => {
		assertions.ifError(new Error());
	});

	passes(t, () => {
		assertions.ifError(null);
	});

	t.end();
});

test('.snapshot()', t => {
	// Set to `true` to update the snapshot, then run:
	// "$(npm bin)"/tap --no-cov -R spec test/assert.js
	//
	// Ignore errors and make sure not to run tests with the `-b` (bail) option.
	const updating = false;

	const projectDir = path.join(__dirname, 'fixture');
	const manager = snapshotManager.load({
		projectDir,
		testDir: projectDir,
		name: 'assert.js',
		relFile: 'test/assert.js',
		updating
	});
	const setup = title => {
		const fauxTest = new Test({
			title,
			compareTestSnapshot: options => manager.compare(options)
		});
		const executionContext = {
			_test: fauxTest
		};
		return executionContext;
	};

	passes(t, () => {
		const executionContext = setup('passes');
		assertions.snapshot.call(executionContext, {foo: 'bar'});
		assertions.snapshot.call(executionContext, {foo: 'bar'}, {id: 'fixed id'}, 'message not included in snapshot report');
		assertions.snapshot.call(executionContext, React.createElement(HelloMessage, {name: 'Sindre'}));
		assertions.snapshot.call(executionContext, renderer.create(React.createElement(HelloMessage, {name: 'Sindre'})).toJSON());
	});

	{
		const executionContext = setup('fails');
		if (updating) {
			assertions.snapshot.call(executionContext, {foo: 'bar'});
		} else {
			failsWith(t, () => {
				assertions.snapshot.call(executionContext, {foo: 'not bar'});
			}, {
				assertion: 'snapshot',
				message: 'Did not match snapshot',
				values: [{label: 'Difference:', formatted: '  {\n-   foo: \'not bar\',\n+   foo: \'bar\',\n  }'}]
			});
		}
	}

	failsWith(t, () => {
		const executionContext = setup('fails (fixed id)');
		assertions.snapshot.call(executionContext, {foo: 'not bar'}, {id: 'fixed id'}, 'different message, also not included in snapshot report');
	}, {
		assertion: 'snapshot',
		message: 'different message, also not included in snapshot report',
		values: [{label: 'Difference:', formatted: '  {\n-   foo: \'not bar\',\n+   foo: \'bar\',\n  }'}]
	});

	{
		const executionContext = setup('fails');
		if (updating) {
			assertions.snapshot.call(executionContext, {foo: 'bar'}, 'my message');
		} else {
			failsWith(t, () => {
				assertions.snapshot.call(executionContext, {foo: 'not bar'}, 'my message');
			}, {
				assertion: 'snapshot',
				message: 'my message',
				values: [{label: 'Difference:', formatted: '  {\n-   foo: \'not bar\',\n+   foo: \'bar\',\n  }'}]
			});
		}
	}

	{
		const executionContext = setup('rendered comparison');
		if (updating) {
			assertions.snapshot.call(executionContext, renderer.create(React.createElement(HelloMessage, {name: 'Sindre'})).toJSON());
		} else {
			passes(t, () => {
				assertions.snapshot.call(executionContext, React.createElement('div', null, 'Hello ', React.createElement('mark', null, 'Sindre')));
			});
		}
	}

	{
		const executionContext = setup('rendered comparison');
		if (updating) {
			assertions.snapshot.call(executionContext, renderer.create(React.createElement(HelloMessage, {name: 'Sindre'})).toJSON());
		} else {
			failsWith(t, () => {
				assertions.snapshot.call(executionContext, renderer.create(React.createElement(HelloMessage, {name: 'Vadim'})).toJSON());
			}, {
				assertion: 'snapshot',
				message: 'Did not match snapshot',
				values: [{label: 'Difference:', formatted: '  <div>\n    Hello \n    <mark>\n-     Vadim\n+     Sindre\n    </mark>\n  </div>'}]
			});
		}
	}

	{
		const executionContext = setup('element comparison');
		if (updating) {
			assertions.snapshot.call(executionContext, React.createElement(HelloMessage, {name: 'Sindre'}));
		} else {
			failsWith(t, () => {
				assertions.snapshot.call(executionContext, React.createElement(HelloMessage, {name: 'Vadim'}));
			}, {
				assertion: 'snapshot',
				message: 'Did not match snapshot',
				values: [{label: 'Difference:', formatted: '  <HelloMessage⍟\n-   name="Vadim"\n+   name="Sindre"\n  />'}]
			});
		}
	}

	manager.save();
	t.end();
});

test('.truthy()', t => {
	failsWith(t, () => {
		assertions.truthy(0);
	}, {
		assertion: 'truthy',
		message: '',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /0/}]
	});

	failsWith(t, () => {
		assertions.truthy(false, 'my message');
	}, {
		assertion: 'truthy',
		message: 'my message',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /false/}]
	});

	passes(t, () => {
		assertions.truthy(1);
		assertions.truthy(true);
	});

	t.end();
});

test('.falsy()', t => {
	failsWith(t, () => {
		assertions.falsy(1);
	}, {
		assertion: 'falsy',
		message: '',
		operator: '!',
		values: [{label: 'Value is not falsy:', formatted: /1/}]
	});

	failsWith(t, () => {
		assertions.falsy(true, 'my message');
	}, {
		assertion: 'falsy',
		message: 'my message',
		operator: '!',
		values: [{label: 'Value is not falsy:', formatted: /true/}]
	});

	passes(t, () => {
		assertions.falsy(0);
		assertions.falsy(false);
	});

	t.end();
});

test('.true()', t => {
	failsWith(t, () => {
		assertions.true(1);
	}, {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /1/}]
	});

	failsWith(t, () => {
		assertions.true(0);
	}, {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /0/}]
	});

	failsWith(t, () => {
		assertions.true(false);
	}, {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /false/}]
	});

	failsWith(t, () => {
		assertions.true('foo', 'my message');
	}, {
		assertion: 'true',
		message: 'my message',
		values: [{label: 'Value is not `true`:', formatted: /foo/}]
	});

	passes(t, () => {
		assertions.true(true);
	});

	t.end();
});

test('.false()', t => {
	failsWith(t, () => {
		assertions.false(0);
	}, {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /0/}]
	});

	failsWith(t, () => {
		assertions.false(1);
	}, {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /1/}]
	});

	failsWith(t, () => {
		assertions.false(true);
	}, {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /true/}]
	});

	failsWith(t, () => {
		assertions.false('foo', 'my message');
	}, {
		assertion: 'false',
		message: 'my message',
		values: [{label: 'Value is not `false`:', formatted: /foo/}]
	});

	passes(t, () => {
		assertions.false(false);
	});

	t.end();
});

test('.regex()', t => {
	passes(t, () => {
		assertions.regex('abc', /^abc$/);
	});

	failsWith(t, () => {
		assertions.regex('foo', /^abc$/);
	}, {
		assertion: 'regex',
		message: '',
		values: [
			{label: 'Value must match expression:', formatted: /foo/},
			{label: 'Regular expression:', formatted: /\/\^abc\$\//}
		]
	});

	failsWith(t, () => {
		assertions.regex('foo', /^abc$/, 'my message');
	}, {
		assertion: 'regex',
		message: 'my message',
		values: [
			{label: 'Value must match expression:', formatted: /foo/},
			{label: 'Regular expression:', formatted: /\/\^abc\$\//}
		]
	});

	t.end();
});

test('.regex() fails if passed a bad value', t => {
	failsWith(t, () => {
		assertions.regex(42, /foo/);
	}, {
		assertion: 'regex',
		message: '`t.regex()` must be called with a string',
		values: [{label: 'Called with:', formatted: /42/}]
	});

	failsWith(t, () => {
		assertions.regex('42', {});
	}, {
		assertion: 'regex',
		message: '`t.regex()` must be called with a regular expression',
		values: [{label: 'Called with:', formatted: /\{\}/}]
	});

	t.end();
});

test('.notRegex()', t => {
	passes(t, () => {
		assertions.notRegex('abc', /def/);
	});

	failsWith(t, () => {
		assertions.notRegex('abc', /abc/);
	}, {
		assertion: 'notRegex',
		message: '',
		values: [
			{label: 'Value must not match expression:', formatted: /abc/},
			{label: 'Regular expression:', formatted: /\/abc\//}
		]
	});

	failsWith(t, () => {
		assertions.notRegex('abc', /abc/, 'my message');
	}, {
		assertion: 'notRegex',
		message: 'my message',
		values: [
			{label: 'Value must not match expression:', formatted: /abc/},
			{label: 'Regular expression:', formatted: /\/abc\//}
		]
	});

	t.end();
});

test('.notRegex() fails if passed a bad value', t => {
	failsWith(t, () => {
		assertions.notRegex(42, /foo/);
	}, {
		assertion: 'notRegex',
		message: '`t.notRegex()` must be called with a string',
		values: [{label: 'Called with:', formatted: /42/}]
	});

	failsWith(t, () => {
		assertions.notRegex('42', {});
	}, {
		assertion: 'notRegex',
		message: '`t.notRegex()` must be called with a regular expression',
		values: [{label: 'Called with:', formatted: /\{\}/}]
	});

	t.end();
});
