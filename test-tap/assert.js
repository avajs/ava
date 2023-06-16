import path from 'node:path';
import {fileURLToPath} from 'node:url';

import stripAnsi from 'strip-ansi';
import {test} from 'tap';

import * as assert from '../lib/assert.js';
import * as snapshotManager from '../lib/snapshot-manager.js';
import {set as setOptions} from '../lib/worker/options.cjs';

setOptions({chalkOptions: {level: 0}});

let lastFailure = null;
let lastPassed = false;

const AssertionsBase = class extends assert.Assertions {
	constructor(overwrites = {}) {
		super({
			pass() {
				lastPassed = true;
			},
			pending(promise) {
				promise.then(() => {
					lastPassed = true;
				}, error => {
					lastFailure = error;
				});
			},
			fail(error) {
				lastFailure = error;
			},
			skip() {},
			experiments: {},
			...overwrites,
		});
	}
};

const assertions = new AssertionsBase();

function assertFailure(t, subset) {
	if (!lastFailure) {
		t.fail('Expected assertion to fail');
		return;
	}

	t.equal(lastFailure.assertion, subset.assertion);
	t.equal(lastFailure.message, subset.message);
	t.equal(lastFailure.name, 'AssertionError');
	t.equal(lastFailure.operator, subset.operator);
	if (subset.raw) {
		t.equal(lastFailure.raw.expected, subset.raw.expected);
		t.equal(lastFailure.raw.actual, subset.raw.actual);
	}

	if (subset.values) {
		t.equal(lastFailure.values.length, subset.values.length);
		for (const [i, s] of lastFailure.values.entries()) {
			t.equal(stripAnsi(s.label), subset.values[i].label);
			t.match(stripAnsi(s.formatted), subset.values[i].formatted);
		}
	} else {
		t.same(lastFailure.values, []);
	}
}

let gathering = false;
let gatheringPromise = Promise.resolve();
function gather(run) {
	return t => {
		if (gathering) {
			throw new Error('Cannot nest gather()');
		}

		gathering = true;
		try {
			run(t);
			return gatheringPromise;
		} finally {
			gathering = false;
			gatheringPromise = Promise.resolve();
		}
	};
}

function add(fn) {
	if (!gathering) {
		throw new Error('Cannot add promise, must be called from gather() callback');
	}

	gatheringPromise = gatheringPromise.then(fn);
	return gatheringPromise;
}

function failsWith(t, fn, subset, {expectBoolean = true} = {}) {
	lastFailure = null;
	const retval = fn();
	assertFailure(t, subset);
	if (expectBoolean) {
		t.notOk(retval);
	}
}

function throwsAsyncFails(t, fn, subset) {
	return add(() => {
		lastFailure = null;
		return fn().then(retval => {
			t.equal(retval, undefined);
			assertFailure(t, subset);
		});
	});
}

function notThrowsAsyncFails(t, fn, subset) {
	return add(() => {
		lastFailure = null;
		return fn().then(retval => {
			t.equal(retval, undefined);
			assertFailure(t, subset);
		});
	});
}

function fails(t, fn) {
	lastFailure = null;
	const retval = fn();
	if (lastFailure) {
		t.notOk(retval);
	} else {
		t.fail('Expected assertion to fail');
	}
}

function passes(t, fn, {expectBoolean = true} = {}) {
	lastPassed = false;
	lastFailure = null;
	const retval = fn();
	if (lastPassed) {
		if (expectBoolean) {
			t.ok(retval);
		} else {
			t.pass();
		}
	} else {
		t.error(lastFailure, 'Expected assertion to pass');
	}
}

function throwsAsyncPasses(t, fn) {
	return add(() => {
		lastPassed = false;
		lastFailure = null;
		return fn().then(() => {
			if (lastPassed) {
				t.pass();
			} else {
				t.error(lastFailure, 'Expected assertion to pass');
			}
		});
	});
}

const notThrowsAsyncPasses = throwsAsyncPasses;

test('.pass()', t => {
	passes(t, () => assertions.pass());

	passes(t, () => assertions.pass());

	t.end();
});

test('.fail()', t => {
	failsWith(t, () => assertions.fail(), {
		assertion: 'fail',
		message: 'Test failed via `t.fail()`',
	});

	failsWith(t, () => assertions.fail('my message'), {
		assertion: 'fail',
		message: 'my message',
	});

	failsWith(t, () => assertions.fail(), {
		assertion: 'fail',
		message: 'Test failed via `t.fail()`',
	});

	failsWith(t, () => assertions.fail(null), {
		assertion: 'fail',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.is()', t => {
	passes(t, () => assertions.is('foo', 'foo'));

	passes(t, () => assertions.is('foo', 'foo'));

	passes(t, () => assertions.is('', ''));

	passes(t, () => assertions.is(true, true));

	passes(t, () => assertions.is(false, false));

	passes(t, () => assertions.is(null, null));

	passes(t, () => assertions.is(undefined, undefined));

	passes(t, () => assertions.is(1, 1));

	passes(t, () => assertions.is(0, 0));

	passes(t, () => assertions.is(-0, -0));

	passes(t, () => assertions.is(Number.NaN, Number.NaN));

	passes(t, () => assertions.is(0 / 0, Number.NaN));

	passes(t, () => {
		const someRef = {foo: 'bar'};
		return assertions.is(someRef, someRef);
	});

	fails(t, () => assertions.is(0, -0));

	fails(t, () => assertions.is(0, false));

	fails(t, () => assertions.is('', false));

	fails(t, () => assertions.is('0', 0));

	fails(t, () => assertions.is('17', 17));

	fails(t, () => assertions.is([1, 2], '1,2'));

	fails(t, () =>
		// eslint-disable-next-line no-new-wrappers, unicorn/new-for-builtins
		assertions.is(new String('foo'), 'foo'),
	);

	fails(t, () => assertions.is(null, undefined));

	fails(t, () => assertions.is(null, false));

	fails(t, () => assertions.is(undefined, false));

	fails(t, () =>
		// eslint-disable-next-line no-new-wrappers, unicorn/new-for-builtins
		assertions.is(new String('foo'), new String('foo')),
	);

	fails(t, () => assertions.is(0, null));

	fails(t, () => assertions.is(0, Number.NaN));

	fails(t, () => assertions.is('foo', Number.NaN));

	failsWith(t, () => assertions.is({foo: 'bar'}, {foo: 'bar'}), {
		assertion: 'is',
		message: '',
		actual: {foo: 'bar'},
		expected: {foo: 'bar'},
		values: [{
			label: 'Values are deeply equal to each other, but they are not the same:',
			formatted: /foo/,
		}],
	});

	failsWith(t, () => assertions.is('foo', 'bar'), {
		assertion: 'is',
		message: '',
		raw: {actual: 'foo', expected: 'bar'},
		values: [
			{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 'bar'/},
		],
	});

	failsWith(t, () => assertions.is('foo', 42), {
		actual: 'foo',
		assertion: 'is',
		expected: 42,
		message: '',
		values: [
			{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 42/},
		],
	});

	failsWith(t, () => assertions.is('foo', 42, 'my message'), {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 42/},
		],
	});

	failsWith(t, () => assertions.is(0, -0, 'my message'), {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference (- actual, + expected):', formatted: /- 0\n\+ -0/},
		],
	});

	failsWith(t, () => assertions.is(-0, 0, 'my message'), {
		assertion: 'is',
		message: 'my message',
		values: [
			{label: 'Difference (- actual, + expected):', formatted: /- -0\n\+ 0/},
		],
	});

	failsWith(t, () => assertions.is(0, 0, null), {
		assertion: 'is',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.not()', t => {
	passes(t, () => assertions.not('foo', 'bar'));

	passes(t, () => assertions.not('foo', 'bar'));

	fails(t, () => assertions.not(Number.NaN, Number.NaN));

	fails(t, () => assertions.not(0 / 0, Number.NaN));

	failsWith(t, () => assertions.not('foo', 'foo'), {
		assertion: 'not',
		message: '',
		raw: {actual: 'foo', expected: 'foo'},
		values: [{label: 'Value is the same as:', formatted: /foo/}],
	});

	failsWith(t, () => assertions.not('foo', 'foo', 'my message'), {
		assertion: 'not',
		message: 'my message',
		values: [{label: 'Value is the same as:', formatted: /foo/}],
	});

	failsWith(t, () => assertions.not(0, 1, null), {
		assertion: 'not',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.deepEqual()', t => {
	// Tests starting here are to detect regressions in the underlying libraries
	// used to test deep object equality

	fails(t, () => assertions.deepEqual({a: false}, {a: 0}));

	passes(t, () => assertions.deepEqual({
		a: 'a',
		b: 'b',
	}, {
		b: 'b',
		a: 'a',
	}));

	passes(t, () => assertions.deepEqual({a: 'a', b: 'b'}, {b: 'b', a: 'a'}));

	passes(t, () => assertions.deepEqual({
		a: 'a',
		b: 'b',
		c: {
			d: 'd',
		},
	}, {
		c: {
			d: 'd',
		},
		b: 'b',
		a: 'a',
	}));

	fails(t, () => assertions.deepEqual([1, 2, 3], [1, 2, 3, 4]));

	passes(t, () => assertions.deepEqual([1, 2, 3], [1, 2, 3]));

	fails(t, () => {
		const fnA = a => a;
		const fnB = a => a;
		return assertions.deepEqual(fnA, fnB);
	});

	passes(t, () => {
		const x1 = {z: 4};
		const y1 = {x: x1};
		x1.y = y1;

		const x2 = {z: 4};
		const y2 = {x: x2};
		x2.y = y2;

		return assertions.deepEqual(x1, x2);
	});

	passes(t, () => {
		function Foo(a) {
			this.a = a;
		}

		const x = new Foo(1);
		const y = new Foo(1);

		return assertions.deepEqual(x, y);
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

		return assertions.deepEqual(x, y);
	});

	fails(t, () => assertions.deepEqual({
		a: 'a',
		b: 'b',
		c: {
			d: false,
		},
	}, {
		c: {
			d: 0,
		},
		b: 'b',
		a: 'a',
	}));

	fails(t, () => assertions.deepEqual({}, []));

	fails(t, () => assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']));

	fails(t, () => assertions.deepEqual({a: 1}, {a: 1, b: undefined}));

	fails(t, () => assertions.deepEqual(new Date('1972-08-01'), null));

	fails(t, () => assertions.deepEqual(new Date('1972-08-01'), undefined));

	passes(t, () => assertions.deepEqual(new Date('1972-08-01'), new Date('1972-08-01')));

	passes(t, () => assertions.deepEqual({x: new Date('1972-08-01')}, {x: new Date('1972-08-01')}));

	fails(t, () => assertions.deepEqual(() => {}, () => {}));

	passes(t, () => assertions.deepEqual(undefined, undefined)
            && assertions.deepEqual({x: undefined}, {x: undefined})
            && assertions.deepEqual({x: [undefined]}, {x: [undefined]}));

	passes(t, () => assertions.deepEqual(null, null)
            && assertions.deepEqual({x: null}, {x: null})
            && assertions.deepEqual({x: [null]}, {x: [null]}));

	passes(t, () => assertions.deepEqual(0, 0)
            && assertions.deepEqual(1, 1)
            && assertions.deepEqual(3.14, 3.14));

	fails(t, () => assertions.deepEqual(0, 1));

	fails(t, () => assertions.deepEqual(1, -1));

	fails(t, () => assertions.deepEqual(3.14, 2.72));

	fails(t, () => assertions.deepEqual({0: 'a', 1: 'b'}, ['a', 'b']));

	passes(t, () => assertions.deepEqual(
		[
			{foo: {z: 100, y: 200, x: 300}},
			'bar',
			11,
			{baz: {d: 4, a: 1, b: 2, c: 3}},
		],
		[
			{foo: {x: 300, y: 200, z: 100}},
			'bar',
			11,
			{baz: {c: 3, b: 2, a: 1, d: 4}},
		],
	));

	passes(t, () => assertions.deepEqual(
		{x: {a: 1, b: 2}, y: {c: 3, d: 4}},
		{y: {d: 4, c: 3}, x: {b: 2, a: 1}},
	));

	// Regression test end here

	passes(t, () => assertions.deepEqual({a: 'a'}, {a: 'a'}));

	passes(t, () => assertions.deepEqual(['a', 'b'], ['a', 'b']));

	fails(t, () => assertions.deepEqual({a: 'a'}, {a: 'b'}));

	fails(t, () => assertions.deepEqual(['a', 'b'], ['a', 'a']));

	fails(t, () => assertions.deepEqual([['a', 'b'], 'c'], [['a', 'b'], 'd']));

	fails(t, () => {
		const circular = ['a', 'b'];
		circular.push(circular);
		return assertions.deepEqual([circular, 'c'], [circular, 'd']);
	});

	failsWith(t, () => assertions.deepEqual('foo', 'bar'), {
		assertion: 'deepEqual',
		message: '',
		raw: {actual: 'foo', expected: 'bar'},
		values: [{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 'bar'/}],
	});

	failsWith(t, () => assertions.deepEqual('foo', 42), {
		assertion: 'deepEqual',
		message: '',
		raw: {actual: 'foo', expected: 42},
		values: [{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 42/}],
	});

	failsWith(t, () => assertions.deepEqual('foo', 42, 'my message'), {
		assertion: 'deepEqual',
		message: 'my message',
		values: [{label: 'Difference (- actual, + expected):', formatted: /- 'foo'\n\+ 42/}],
	});

	failsWith(t, () => assertions.deepEqual({}, {}, null), {
		assertion: 'deepEqual',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.notDeepEqual()', t => {
	passes(t, () => assertions.notDeepEqual({a: 'a'}, {a: 'b'}));

	passes(t, () => assertions.notDeepEqual({a: 'a'}, {a: 'b'}));

	passes(t, () => assertions.notDeepEqual(['a', 'b'], ['c', 'd']));

	const actual = {a: 'a'};
	const expected = {a: 'a'};
	failsWith(t, () => assertions.notDeepEqual(actual, expected), {
		actual,
		assertion: 'notDeepEqual',
		expected,
		message: '',
		raw: {actual, expected},
		values: [{label: 'Value is deeply equal:', formatted: /.*{.*\n.*a: 'a'/}],
	});

	failsWith(t, () => assertions.notDeepEqual(['a', 'b'], ['a', 'b'], 'my message'), {
		assertion: 'notDeepEqual',
		message: 'my message',
		values: [{label: 'Value is deeply equal:', formatted: /.*\[.*\n.*'a',\n.*'b',/}],
	});

	failsWith(t, () => assertions.notDeepEqual({}, [], null), {
		assertion: 'notDeepEqual',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.like()', t => {
	fails(t, () => assertions.like({a: false}, {a: 0}));

	passes(t, () => assertions.like({
		a: 'a',
		b: 'b',
	}, {
		b: 'b',
		a: 'a',
	}));

	passes(t, () => assertions.like({a: 'a', b: 'b'}, {b: 'b', a: 'a'}));

	passes(t, () => assertions.like({
		a: 'a',
		b: 'b',
		c: {
			d: 'd',
			x: 'x',
		},
		x: 'x',
	}, {
		c: {
			d: 'd',
		},
		b: 'b',
		a: 'a',
	}));

	fails(t, () => assertions.like([1, 2, 3], [1, 2, 3, 4]));

	fails(t, () => assertions.like({
		a: [1, 2, 3],
	}, {
		a: [1, 2, 3, 4],
	}));

	passes(t, () => assertions.like({
		a: [1, 2, 3],
		x: 'x',
	}, {
		a: [1, 2, 3],
	}));

	passes(t, () => {
		const actual = {
			a: 'a',
			extra: 'irrelevant',
		};
		actual.circular = actual;

		const likePattern = {
			a: 'a',
		};

		return assertions.like(actual, likePattern);
	});

	fails(t, () => {
		const fnA = a => a;
		const fnB = a => a;
		return assertions.like(fnA, fnB);
	});

	fails(t, () => {
		const fnA = a => a;
		const fnB = a => a;
		return assertions.like({
			fn: fnA,
		}, {
			fn: fnB,
		});
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

		return assertions.like(x, y);
	});

	passes(t, () => assertions.like({a: 'a'}, {a: 'a'}));

	passes(t, () => assertions.like({a: 'a', b: 'b'}, {a: 'a'}));

	passes(t, () => assertions.like({ab: ['a', 'b']}, {ab: ['a', 'b']}));

	passes(t, () => assertions.like({ab: ['a', 'b'], c: 'c'}, {ab: ['a', 'b']}));

	fails(t, () => assertions.like({a: 'a'}, {a: 'b'}));

	fails(t, () => assertions.like({a: 'a', b: 'b'}, {a: 'b'}));

	fails(t, () => assertions.like({ab: ['a', 'b']}, {ab: ['a', 'a']}));

	fails(t, () => assertions.like({ab: ['a', 'b'], c: 'c'}, {ab: ['a', 'a']}));

	fails(t, () => assertions.like([['a', 'b'], 'c'], [['a', 'b'], 'd']));

	fails(t, () => {
		const circular = ['a', 'b'];
		circular.push(circular);
		return assertions.like([circular, 'c'], [circular, 'd']);
	});

	fails(t, () => {
		const circular = ['a', 'b'];
		circular.push(circular);
		return assertions.like({xc: [circular, 'c']}, {xc: [circular, 'd']});
	});

	failsWith(t, () => assertions.like({a: 'a'}, Object.defineProperties({}, {ignored: {}})), {
		assertion: 'like',
		message: '`t.like()` selector must be a non-empty object',
		values: [{label: 'Called with:', formatted: '{}'}],
	});

	failsWith(t, () => assertions.like('foo', 'bar'), {
		assertion: 'like',
		message: '`t.like()` selector must be a non-empty object',
		values: [{label: 'Called with:', formatted: '\'bar\''}],
	});

	passes(t, () => {
		const specimen = {[Symbol.toStringTag]: 'Custom', extra: true};
		const selector = Object.defineProperties(
			{[Symbol.toStringTag]: 'Custom'},
			{ignored: {value: true}},
		);
		return assertions.like(specimen, selector);
	});

	passes(t, () => {
		const array = ['c1', 'c2'];
		return assertions.like({a: 'a', b: 'b', c: ['c1', 'c2'], d: ['c1', 'c2']}, {b: 'b', d: array, c: array});
	});

	failsWith(t, () => {
		const likePattern = {
			a: 'a',
		};
		likePattern.circular = likePattern;

		return assertions.like({}, likePattern);
	}, {
		assertion: 'like',
		message: '`t.like()` selector must not contain circular references',
		values: [{label: 'Called with:', formatted: '{\n  a: \'a\',\n  circular: [Circular],\n}'}],
	});

	failsWith(t, () => assertions.like({}, {}, null), {
		assertion: 'like',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	failsWith(t, () => assertions.like({a: 'foo', b: 'irrelevant'}, {a: 'bar'}), {
		assertion: 'like',
		message: '',
		values: [{label: 'Difference (- actual, + expected):', formatted: /{\n-\s*a: 'foo',\n\+\s*a: 'bar',\n\s*}/}],
	});

	passes(t, () => assertions.like({a: [{a: 1, b: 2}]}, {a: [{a: 1}]}));
	passes(t, () => assertions.like([{a: 1, b: 2}], [{a: 1}]));
	passes(t, () => assertions.like([{a: 1, b: 2}, {c: 3}], [{a: 1}]));

	passes(t, () => assertions.like([1, 2, 3], [1, 2, 3]));
	passes(t, () => assertions.like([1, 2, 3], [1, 2]));
	// eslint-disable-next-line no-sparse-arrays
	passes(t, () => assertions.like([1, 2, 3], [1, , 3]));

	fails(t, () => assertions.like([1, 2, 3], [3, 2, 1]));
	// eslint-disable-next-line no-sparse-arrays
	fails(t, () => assertions.like([1, 2, 3], [1, , 4]));
	fails(t, () => assertions.like([1, 2], [1, 2, 3]));

	t.end();
});

test('.throws()', gather(t => {
	// Fails because function doesn't throw.
	failsWith(t, () => assertions.throws(() => {}), {
		assertion: 'throws',
		message: '',
		values: [{label: 'Function returned:', formatted: /undefined/}],
	});

	failsWith(t, () => assertions.throws(() => {}), {
		assertion: 'throws',
		message: '',
		values: [{label: 'Function returned:', formatted: /undefined/}],
	});

	// Fails because function doesn't throw. Asserts that 'my message' is used
	// as the assertion message (*not* compared against the error).
	failsWith(t, () => assertions.throws(() => {}, undefined, 'my message'), {
		assertion: 'throws',
		message: 'my message',
		values: [{label: 'Function returned:', formatted: /undefined/}],
	});

	// Fails because the function returned a promise.
	failsWith(t, () => assertions.throws(() => Promise.resolve()), {
		assertion: 'throws',
		message: '',
		values: [{label: 'Function returned a promise. Use `t.throwsAsync()` instead:', formatted: /Promise/}],
	});

	// Fails because thrown exception is not an error
	failsWith(t, () => assertions.throws(() => {
		const error = 'foo';
		throw error;
	}), {
		assertion: 'throws',
		message: '',
		values: [
			{label: 'Function threw exception that is not an error:', formatted: /'foo'/},
		],
	});

	// Passes because an error is thrown.
	passes(t, () => assertions.throws(() => {
		throw new Error('foo');
	}));

	// Passes because the correct error is thrown.
	passes(t, () => {
		const error = new Error('foo');
		return assertions.throws(() => {
			throw error;
		}, {is: error});
	});

	// Fails because the thrown value is not an error
	fails(t, () => {
		const object = {};
		return assertions.throws(() => {
			throw object;
		}, {is: object});
	});

	// Fails because the thrown value is not the right one
	fails(t, () => {
		const error = new Error('foo');
		return assertions.throws(() => {
			throw error;
		}, {is: {}});
	});

	// Passes because the correct error is thrown.
	passes(t, () => assertions.throws(() => {
		throw new TypeError();
	}, {name: 'TypeError'}));

	// Fails because the thrown value is not an error
	fails(t, () => assertions.throws(() => {
		const error = {name: 'Bob'};
		throw error;
	}, {name: 'Bob'}));

	// Fails because the thrown value is not the right one
	fails(t, () => assertions.throws(() => {
		throw new Error('foo');
	}, {name: 'TypeError'}));

	// Passes because the correct error is thrown.
	passes(t, () => assertions.throws(() => {
		const error = new TypeError();
		error.code = 'ERR_TEST';
		throw error;
	}, {code: 'ERR_TEST'}));

	// Passes because the correct error is thrown.
	passes(t, () => assertions.throws(() => {
		const error = new TypeError();
		error.code = 42;
		throw error;
	}, {code: 42}));

	// Fails because the thrown value is not the right one
	fails(t, () => assertions.throws(() => {
		const error = new TypeError();
		error.code = 'ERR_NOPE';
		throw error;
	}, {code: 'ERR_TEST'}));

	fails(t, () => assertions.throws(() => {
		const error = new TypeError();
		error.code = 1;
		throw error;
	}, {code: 42}));

	// Regression test for https://github.com/avajs/ava/issues/1676
	fails(t, () => assertions.throws(() => {
		throw new Error('foo');
	}, false));

	passes(t, () => assertions.throws(() => {
		throw new Error('foo');
	}, undefined));

	passes(t, async () => {
		await assertions.throwsAsync(() => Promise.reject(new Error('foo')), undefined);
	});

	failsWith(t, () => assertions.throws(() => {}, undefined, null), {
		assertion: 'throws',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	// Fails because the string in the message is incorrect
	failsWith(
		t,
		() =>
			assertions.throws(
				() => {
					throw new Error('error');
				},
				{message: 'my error'},
			),
		{
			assertion: 'throws',
			message: '',
			values: [
				{label: 'Function threw unexpected exception:', formatted: /error/},
				{label: 'Expected message to equal:', formatted: /my error/},
			],
		},
	);

	passes(t, () => assertions.throws(() => {
		throw new Error('error');
	}, {message: 'error'}));

	// Fails because the regular expression in the message is incorrect
	failsWith(
		t,
		() =>
			assertions.throws(
				() => {
					throw new Error('error');
				},
				{message: /my error/},
			),
		{
			assertion: 'throws',
			message: '',
			values: [
				{label: 'Function threw unexpected exception:', formatted: /error/},
				{label: 'Expected message to match:', formatted: /my error/},
			],
		},
	);

	passes(t, () => assertions.throws(() => {
		throw new Error('error');
	}, {message: /error/}));

	// Fails because the function in the message returns false
	failsWith(
		t,
		() =>
			assertions.throws(
				() => {
					throw new Error('error');
				},
				{message: () => false},
			),
		{
			assertion: 'throws',
			message: '',
			values: [
				{label: 'Function threw unexpected exception:', formatted: /error/},
				{label: 'Expected message to return true:', formatted: /Function/},
			],
		},
	);

	passes(t, () => assertions.throws(() => {
		throw new Error('error');
	}, {message: () => true}));
}));

test('.throws() returns the thrown error', t => {
	const expected = new Error();
	const actual = assertions.throws(() => {
		throw expected;
	});

	t.equal(actual, expected);

	t.end();
});

test('.throwsAsync()', gather(t => {
	// Fails because the promise is resolved, not rejected.
	throwsAsyncFails(t, () => assertions.throwsAsync(Promise.resolve('foo')), {
		assertion: 'throwsAsync',
		message: '',
		values: [{label: 'Promise resolved with:', formatted: /'foo'/}],
	});

	throwsAsyncFails(t, () => assertions.throwsAsync(Promise.resolve('foo')), {
		assertion: 'throwsAsync',
		message: '',
		values: [{label: 'Promise resolved with:', formatted: /'foo'/}],
	});

	// Fails because the promise is resolved with an Error
	throwsAsyncFails(t, () => assertions.throwsAsync(Promise.resolve(new Error())), {
		assertion: 'throwsAsync',
		message: '',
		values: [{label: 'Promise resolved with:', formatted: /Error/}],
	});

	// Fails because the function returned a promise that resolved, not rejected.
	throwsAsyncFails(t, () => assertions.throwsAsync(() => Promise.resolve('foo')), {
		assertion: 'throwsAsync',
		message: '',
		values: [{label: 'Returned promise resolved with:', formatted: /'foo'/}],
	});

	// Passes because the promise was rejected with an error.
	throwsAsyncPasses(t, () => assertions.throwsAsync(Promise.reject(new Error())));

	// Passes because the function returned a promise rejected with an error.
	throwsAsyncPasses(t, () => assertions.throwsAsync(() => Promise.reject(new Error())));

	// Fails because the function throws synchronously
	throwsAsyncFails(t, () => assertions.throwsAsync(() => {
		throw new Error('sync');
	}, undefined, 'message'), {
		assertion: 'throwsAsync',
		message: 'message',
		values: [
			{label: 'Function threw synchronously. Use `t.throws()` instead:', formatted: /Error/},
		],
	});

	// Fails because the function did not return a promise
	throwsAsyncFails(t, () => assertions.throwsAsync(() => {}, undefined, 'message'), {
		assertion: 'throwsAsync',
		message: 'message',
		values: [
			{label: 'Function returned:', formatted: /undefined/},
		],
	});

	throwsAsyncFails(t, () => assertions.throwsAsync(Promise.resolve(), undefined, null), {
		assertion: 'throwsAsync',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});
}));

test('.throwsAsync() returns the rejection reason of promise', t => {
	const expected = new Error();

	return assertions.throwsAsync(Promise.reject(expected)).then(actual => {
		t.equal(actual, expected);
		t.end();
	});
});

test('.throwsAsync() returns the rejection reason of a promise returned by the function', t => {
	const expected = new Error();

	return assertions.throwsAsync(() => Promise.reject(expected)).then(actual => {
		t.equal(actual, expected);
		t.end();
	});
});

test('.throws() fails if passed a bad value', t => {
	failsWith(t, () => assertions.throws('not a function'), {
		assertion: 'throws',
		message: '`t.throws()` must be called with a function',
		values: [{label: 'Called with:', formatted: /not a function/}],
	});

	t.end();
});

test('.throwsAsync() fails if passed a bad value', t => {
	failsWith(t, () => assertions.throwsAsync('not a function'), {
		assertion: 'throwsAsync',
		message: '`t.throwsAsync()` must be called with a function or promise',
		values: [{label: 'Called with:', formatted: /not a function/}],
	}, {expectBoolean: false});

	t.end();
});

test('.throws() fails if passed a bad expectation', t => {
	failsWith(t, () => assertions.throws(() => {}, true), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /true/}],
	});

	failsWith(t, () => assertions.throws(() => {}, 'foo'), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /foo/}],
	});

	failsWith(t, () => assertions.throws(() => {}, /baz/), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /baz/}],
	});

	failsWith(t, () => assertions.throws(() => {}, class Bar {}), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /Bar/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {}), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /{}/}],
	});

	failsWith(t, () => assertions.throws(() => {}, []), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /\[]/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {code: {}}), {
		assertion: 'throws',
		message: 'The `code` property of the second argument to `t.throws()` must be a string or number',
		values: [{label: 'Called with:', formatted: /code: {}/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {instanceOf: null}), {
		assertion: 'throws',
		message: 'The `instanceOf` property of the second argument to `t.throws()` must be a function',
		values: [{label: 'Called with:', formatted: /instanceOf: null/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {message: null}), {
		assertion: 'throws',
		message: 'The `message` property of the second argument to `t.throws()` must be a string, regular expression or a function',
		values: [{label: 'Called with:', formatted: /message: null/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {name: null}), {
		assertion: 'throws',
		message: 'The `name` property of the second argument to `t.throws()` must be a string',
		values: [{label: 'Called with:', formatted: /name: null/}],
	});

	failsWith(t, () => assertions.throws(() => {}, {is: {}, message: '', name: '', of() {}, foo: null}), {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` contains unexpected properties',
		values: [{label: 'Called with:', formatted: /foo: null/}],
	});

	t.end();
});

test('.throwsAsync() fails if passed a bad expectation', t => {
	failsWith(t, () => assertions.throwsAsync(() => {}, true), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /true/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, 'foo'), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /foo/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, /baz/), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /baz/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, class Bar {}), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /Bar/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {}), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /{}/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, []), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object, `null` or `undefined`',
		values: [{label: 'Called with:', formatted: /\[]/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {code: {}}), {
		assertion: 'throwsAsync',
		message: 'The `code` property of the second argument to `t.throwsAsync()` must be a string or number',
		values: [{label: 'Called with:', formatted: /code: {}/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {instanceOf: null}), {
		assertion: 'throwsAsync',
		message: 'The `instanceOf` property of the second argument to `t.throwsAsync()` must be a function',
		values: [{label: 'Called with:', formatted: /instanceOf: null/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {message: null}), {
		assertion: 'throwsAsync',
		message: 'The `message` property of the second argument to `t.throwsAsync()` must be a string, regular expression or a function',
		values: [{label: 'Called with:', formatted: /message: null/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {name: null}), {
		assertion: 'throwsAsync',
		message: 'The `name` property of the second argument to `t.throwsAsync()` must be a string',
		values: [{label: 'Called with:', formatted: /name: null/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.throwsAsync(() => {}, {is: {}, message: '', name: '', of() {}, foo: null}), {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` contains unexpected properties',
		values: [{label: 'Called with:', formatted: /foo: null/}],
	}, {expectBoolean: false});

	t.end();
});

test('.throws() fails if passed null expectation', t => {
	const asserter = new AssertionsBase();

	failsWith(t, () => {
		asserter.throws(() => {}, null);
	}, {
		assertion: 'throws',
		message: 'The second argument to `t.throws()` must be an expectation object or `undefined`',
		values: [{label: 'Called with:', formatted: /null/}],
	});

	t.end();
});

test('.throwsAsync() fails if passed null', t => {
	const asserter = new AssertionsBase();

	failsWith(t, () => {
		asserter.throwsAsync(() => {}, null);
	}, {
		assertion: 'throwsAsync',
		message: 'The second argument to `t.throwsAsync()` must be an expectation object or `undefined`',
		values: [{label: 'Called with:', formatted: /null/}],
	});

	t.end();
});

test('.notThrows()', gather(t => {
	// Passes because the function doesn't throw
	passes(t, () => assertions.notThrows(() => {}), {expectBoolean: false});

	passes(t, () => assertions.notThrows(() => {}), {expectBoolean: false});

	// Fails because the function throws.
	failsWith(t, () => assertions.notThrows(() => {
		throw new Error('foo');
	}), {
		assertion: 'notThrows',
		message: '',
		values: [{label: 'Function threw:', formatted: /foo/}],
	}, {expectBoolean: false});

	// Fails because the function throws. Asserts that message is used for the
	// assertion, not to validate the thrown error.
	failsWith(t, () => assertions.notThrows(() => {
		throw new Error('foo');
	}, 'my message'), {
		assertion: 'notThrows',
		message: 'my message',
		values: [{label: 'Function threw:', formatted: /foo/}],
	}, {expectBoolean: false});

	failsWith(t, () => assertions.notThrows(() => {}, null), {
		assertion: 'notThrows',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	}, {expectBoolean: false});
}));

test('.notThrowsAsync()', gather(t => {
	// Passes because the promise is resolved
	notThrowsAsyncPasses(t, () => assertions.notThrowsAsync(Promise.resolve()));

	notThrowsAsyncPasses(t, () => assertions.notThrowsAsync(Promise.resolve()));

	// Fails because the promise is rejected
	notThrowsAsyncFails(t, () => assertions.notThrowsAsync(Promise.reject(new Error())), {
		assertion: 'notThrowsAsync',
		message: '',
		values: [{label: 'Promise rejected with:', formatted: /Error/}],
	});

	// Passes because the function returned a resolved promise
	notThrowsAsyncPasses(t, () => assertions.notThrowsAsync(() => Promise.resolve()));

	// Fails because the function returned a rejected promise
	notThrowsAsyncFails(t, () => assertions.notThrowsAsync(() => Promise.reject(new Error())), {
		assertion: 'notThrowsAsync',
		message: '',
		values: [{label: 'Returned promise rejected with:', formatted: /Error/}],
	});

	// Fails because the function throws synchronously
	notThrowsAsyncFails(t, () => assertions.notThrowsAsync(() => {
		throw new Error('sync');
	}, 'message'), {
		assertion: 'notThrowsAsync',
		message: 'message',
		values: [
			{label: 'Function threw:', formatted: /Error/},
		],
	});

	// Fails because the function did not return a promise
	notThrowsAsyncFails(t, () => assertions.notThrowsAsync(() => {}, 'message'), {
		assertion: 'notThrowsAsync',
		message: 'message',
		values: [
			{label: 'Function did not return a promise. Use `t.notThrows()` instead:', formatted: /undefined/},
		],
	});

	notThrowsAsyncFails(t, () => assertions.notThrowsAsync(Promise.resolve(), null), {
		assertion: 'notThrowsAsync',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});
}));

test('.notThrowsAsync() returns undefined for a fulfilled promise', t => assertions.notThrowsAsync(Promise.resolve(Symbol(''))).then(actual => {
	t.equal(actual, undefined);
}));

test('.notThrowsAsync() returns undefined for a fulfilled promise returned by the function', t => assertions.notThrowsAsync(() => Promise.resolve(Symbol(''))).then(actual => {
	t.equal(actual, undefined);
}));

test('.notThrows() fails if passed a bad value', t => {
	failsWith(t, () => assertions.notThrows('not a function'), {
		assertion: 'notThrows',
		message: '`t.notThrows()` must be called with a function',
		values: [{label: 'Called with:', formatted: /not a function/}],
	});

	t.end();
});

test('.notThrowsAsync() fails if passed a bad value', t => {
	failsWith(t, () => assertions.notThrowsAsync('not a function'), {
		assertion: 'notThrowsAsync',
		message: '`t.notThrowsAsync()` must be called with a function or promise',
		values: [{label: 'Called with:', formatted: /not a function/}],
	}, {
		expectBoolean: false,
	});

	t.end();
});

test('.snapshot()', async t => {
	// Set to `true` to update the snapshot, then run:
	// npx tap test-tap/assert.js
	//
	// Ignore errors and make sure not to run tests with the `-b` (bail) option.
	const updating = false;

	const projectDir = fileURLToPath(new URL('fixture', import.meta.url));
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'assert.cjs'),
		projectDir,
		fixedLocation: null,
		recordNewSnapshots: updating,
		updating,
	});
	const setup = _title => new class extends assertions.constructor {
		constructor(title) {
			super({
				compareWithSnapshot: assertionOptions => {
					const {record, ...result} = manager.compare({
						belongsTo: this.title,
						expected: assertionOptions.expected,
						index: this.snapshotInvocationCount++,
						label: assertionOptions.message || `Snapshot ${this.snapshotInvocationCount}`,
					});
					if (record) {
						record();
					}

					return result;
				},
			});
			this.title = title;
			this.snapshotInvocationCount = 0;
		}
	}(_title);

	{
		const assertions = setup('passes');

		passes(t, () => assertions.snapshot({foo: 'bar'}));

		passes(t, () => assertions.snapshot({foo: 'bar'}));
	}

	{
		const assertions = setup('fails');
		if (updating) {
			return assertions.snapshot({foo: 'bar'});
		}

		failsWith(t, () => assertions.snapshot({foo: 'not bar'}), {
			assertion: 'snapshot',
			message: 'Did not match snapshot',
			values: [{label: 'Difference (- actual, + expected):', formatted: '  {\n-   foo: \'not bar\',\n+   foo: \'bar\',\n  }'}],
		});
	}

	{
		const assertions = setup('fails');
		if (updating) {
			return assertions.snapshot({foo: 'bar'}, 'my message');
		}

		failsWith(t, () => assertions.snapshot({foo: 'not bar'}, 'my message'), {
			assertion: 'snapshot',
			message: 'my message',
			values: [{label: 'Difference (- actual, + expected):', formatted: '  {\n-   foo: \'not bar\',\n+   foo: \'bar\',\n  }'}],
		});
	}

	{
		const assertions = setup('bad message');
		failsWith(t, () => assertions.snapshot(null, null), {
			assertion: 'snapshot',
			improperUsage: true,
			message: 'The assertion message must be a string',
			values: [{
				label: 'Called with:',
				formatted: /null/,
			}],
		});

		failsWith(t, () => assertions.snapshot(null, ''), {
			assertion: 'snapshot',
			improperUsage: true,
			message: 'The snapshot assertion message must be a non-empty string',
			values: [{
				label: 'Called with:',
				formatted: '\'\'',
			}],
		});
	}

	{
		// See https://github.com/avajs/ava/issues/2669
		const assertions = setup('id');
		failsWith(t, () => assertions.snapshot({foo: 'bar'}, {id: 'an id'}), {
			assertion: 'snapshot',
			improperUsage: true,
			message: 'AVA 4 no longer supports snapshot IDs',
			values: [{
				label: 'Called with id:',
				formatted: '\'an id\'',
			}],
		});
	}

	await manager.save();
	t.end();
});

test('.truthy()', t => {
	failsWith(t, () => assertions.truthy(0), {
		assertion: 'truthy',
		message: '',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /0/}],
	});

	failsWith(t, () => assertions.truthy(false, 'my message'), {
		assertion: 'truthy',
		message: 'my message',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /false/}],
	});

	passes(t, () => assertions.truthy(1)
            && assertions.truthy(true));

	passes(t, () => assertions.truthy(1) && assertions.truthy(true));

	failsWith(t, () => assertions.truthy(true, null), {
		assertion: 'truthy',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.falsy()', t => {
	failsWith(t, () => assertions.falsy(1), {
		assertion: 'falsy',
		message: '',
		operator: '!',
		values: [{label: 'Value is not falsy:', formatted: /1/}],
	});

	failsWith(t, () => assertions.falsy(true, 'my message'), {
		assertion: 'falsy',
		message: 'my message',
		operator: '!',
		values: [{label: 'Value is not falsy:', formatted: /true/}],
	});

	passes(t, () => assertions.falsy(0)
            && assertions.falsy(false));

	passes(t, () => assertions.falsy(0)
            && assertions.falsy(false));

	failsWith(t, () => assertions.falsy(false, null), {
		assertion: 'falsy',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.true()', t => {
	failsWith(t, () => assertions.true(1), {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /1/}],
	});

	failsWith(t, () => assertions.true(0), {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /0/}],
	});

	failsWith(t, () => assertions.true(false), {
		assertion: 'true',
		message: '',
		values: [{label: 'Value is not `true`:', formatted: /false/}],
	});

	failsWith(t, () => assertions.true('foo', 'my message'), {
		assertion: 'true',
		message: 'my message',
		values: [{label: 'Value is not `true`:', formatted: /foo/}],
	});

	passes(t, () => assertions.true(true));

	passes(t, () => {
		const {true: trueFn} = assertions;
		return trueFn(true);
	});

	failsWith(t, () => assertions.true(true, null), {
		assertion: 'true',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.false()', t => {
	failsWith(t, () => assertions.false(0), {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /0/}],
	});

	failsWith(t, () => assertions.false(1), {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /1/}],
	});

	failsWith(t, () => assertions.false(true), {
		assertion: 'false',
		message: '',
		values: [{label: 'Value is not `false`:', formatted: /true/}],
	});

	failsWith(t, () => assertions.false('foo', 'my message'), {
		assertion: 'false',
		message: 'my message',
		values: [{label: 'Value is not `false`:', formatted: /foo/}],
	});

	passes(t, () => assertions.false(false));

	passes(t, () => {
		const {false: falseFn} = assertions;
		return falseFn(false);
	});

	failsWith(t, () => assertions.false(false, null), {
		assertion: 'false',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.regex()', t => {
	passes(t, () => assertions.regex('abc', /^abc$/));

	passes(t, () => assertions.regex('abc', /^abc$/));

	failsWith(t, () => assertions.regex('foo', /^abc$/), {
		assertion: 'regex',
		message: '',
		values: [
			{label: 'Value must match expression:', formatted: /foo/},
			{label: 'Regular expression:', formatted: /\/\^abc\$\//},
		],
	});

	failsWith(t, () => assertions.regex('foo', /^abc$/, 'my message'), {
		assertion: 'regex',
		message: 'my message',
		values: [
			{label: 'Value must match expression:', formatted: /foo/},
			{label: 'Regular expression:', formatted: /\/\^abc\$\//},
		],
	});

	failsWith(t, () => assertions.regex('foo', /^abc$/, null), {
		assertion: 'regex',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.regex() fails if passed a bad value', t => {
	failsWith(t, () => assertions.regex(42, /foo/), {
		assertion: 'regex',
		improperUsage: true,
		message: '`t.regex()` must be called with a string',
		values: [{label: 'Called with:', formatted: /42/}],
	});

	failsWith(t, () => assertions.regex('42', {}), {
		assertion: 'regex',
		message: '`t.regex()` must be called with a regular expression',
		values: [{label: 'Called with:', formatted: /{}/}],
	});

	t.end();
});

test('.notRegex()', t => {
	passes(t, () => assertions.notRegex('abc', /def/));

	passes(t, () => assertions.notRegex('abc', /def/));

	failsWith(t, () => assertions.notRegex('abc', /abc/), {
		assertion: 'notRegex',
		message: '',
		values: [
			{label: 'Value must not match expression:', formatted: /abc/},
			{label: 'Regular expression:', formatted: /\/abc\//},
		],
	});

	failsWith(t, () => assertions.notRegex('abc', /abc/, 'my message'), {
		assertion: 'notRegex',
		message: 'my message',
		values: [
			{label: 'Value must not match expression:', formatted: /abc/},
			{label: 'Regular expression:', formatted: /\/abc\//},
		],
	});

	failsWith(t, () => assertions.notRegex('abc', /abc/, null), {
		assertion: 'notRegex',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});

test('.notRegex() fails if passed a bad value', t => {
	failsWith(t, () => assertions.notRegex(42, /foo/), {
		assertion: 'notRegex',
		message: '`t.notRegex()` must be called with a string',
		values: [{label: 'Called with:', formatted: /42/}],
	});

	failsWith(t, () => assertions.notRegex('42', {}), {
		assertion: 'notRegex',
		message: '`t.notRegex()` must be called with a regular expression',
		values: [{label: 'Called with:', formatted: /{}/}],
	});

	t.end();
});

test('.assert()', t => {
	failsWith(t, () => assertions.assert(0), {
		assertion: 'assert',
		message: '',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /0/}],
	});

	failsWith(t, () => assertions.assert(false, 'my message'), {
		assertion: 'assert',
		message: 'my message',
		operator: '!!',
		values: [{label: 'Value is not truthy:', formatted: /false/}],
	});

	passes(t, () => assertions.assert(1)
            && assertions.assert(true));

	passes(t, () => assertions.assert(1) && assertions.assert(true));

	failsWith(t, () => assertions.assert(null, null), {
		assertion: 'assert',
		improperUsage: true,
		message: 'The assertion message must be a string',
		values: [{
			label: 'Called with:',
			formatted: /null/,
		}],
	});

	t.end();
});
