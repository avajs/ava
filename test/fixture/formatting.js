import React from 'react';
import renderer from 'react-test-renderer';
import HelloMessage from './HelloMessage'
import test from '../../';

// Older AVA versions that do not use Concordance don't handle globals very
// well. Use this so formatting output can be contrasted between versions.
const formatGlobals = !!require(process.env.AVA_PATH + '/package.json').dependencies.concordance

test('date formatted', t => {
	const date = new Date('1969-07-20T20:17:40.000Z');
	t.true(date);
});
test('invalid date formatted', t => {
	const date = new Date('🙀');
	t.true(date);
});
test('date formatted, subclass', t => {
	class Foo extends Date {}
	const date = new Foo('1969-07-20T20:17:40.000Z');
	t.true(date);
});
test('date diff', t => {
	t.deepEqual(new Date('1969-07-20T20:17:40.000Z'), new Date());
});
test('date diff, extra properties', t => {
	t.deepEqual(new Date('1969-07-20T20:17:40.000Z'), Object.assign(new Date('1969-07-20T20:17:40.000Z'), {
		foo: 'bar'
	}));
});

test('error formatted', t => {
	const err = new Error('Houston, we have a problem');
	t.true(err);
});
test('error formatted, constructor does not match name', t => {
	const err = Object.assign(new Error('Houston, we have a problem'), {name: 'FamousWords'});
	t.true(err);
});
test('error formatted, constructor does not match name, and string tag does not match constructor', t => {
	class Custom extends Error {
		constructor(message) {
			super(message);
			this.name = 'FamousWords';
		}
	}
	const err = new Custom('Houston, we have a problem');
	t.true(err);
});
test('error formatted, no name or constructor', t => {
	class Custom extends Error {
		constructor(message) {
			super(message);
			this.name = '';
		}
	}
	const err = new Custom('Houston, we have a problem');
	Object.defineProperty(err, 'constructor', {});
	t.true(err);
});
test('error diff, message', t => {
	t.deepEqual(new Error('Houston, we have a problem'), new Error('One small step'));
});
test('error diff, constructor', t => {
	t.deepEqual(new Error('Houston, we have a problem'), new RangeError('One small step'));
});
test('error diff, extra properties', t => {
	t.deepEqual(new Error('Houston, we have a problem'), Object.assign(new Error('Houston, we have a problem'), {
		date: new Date('1969-07-20T20:17:40.000Z')
	}));
});
test('error thrown in test', t => {
	throw Object.assign(new Error('Houston, we have a problem'), {
		date: new Date('1969-07-20T20:17:40.000Z')
	});
});
test.cb('callback test ended with error', t => {
	t.end(Object.assign(new Error('Houston, we have a problem'), {
		date: new Date('1969-07-20T20:17:40.000Z')
	}));
});
test('error thrown in test due to improper throws', t => {
	const improper = () => {
		throw Object.assign(new Error('Houston, we have a problem'), {
			date: new Date('1969-07-20T20:17:40.000Z')
		});
	};
	t.throws(improper());
});
test('test returned rejected promise', t => {
	return Promise.reject(Object.assign(new Error('Houston, we have a problem'), {
		date: new Date('1969-07-20T20:17:40.000Z')
	}));
});

test('array of strings formatted', t => {
	const arr = ['foo'];
	t.true(arr);
});
test('array of strings diff', t => {
	t.deepEqual(['foo'], ['bar']);
});

test('string formatted', t => {
	t.true('foo');
});
test('string diff', t => {
	t.is('foo', 'bar');
});
test('string diff, with overlap', t => {
	t.is('foobar', 'bar');
});
test('multiline string diff, with overlap at start', t => {
	t.is('foo\nbar', 'foo\nbaz');
});
test('multiline string diff, with overlap at end', t => {
	t.is('bar\nbaz', 'foo\nbaz');
});

test('map formatted', t => {
	const map = new Map([['foo', 'bar']]);
	t.true(map);
});
test('map diff', t => {
	t.deepEqual(new Map([['foo', 'bar']]), new Map([['baz', 'qux']]));
});
test('map diff, extra properties', t => {
	t.deepEqual(new Map([['foo', 'bar']]), Object.assign(new Map([['foo', 'bar']]), {baz: 'qux'}));
});

test('function formatted', t => {
	const fn = function foo() {};
	t.true(fn);
});
test('function diff', t => {
	function foo() {}
	function bar() {}
	t.deepEqual(foo, bar);
});
test('function diff, extra properties', t => {
	function foo() {}
	function bar() {}
	t.deepEqual(foo, Object.assign(bar, {baz: 'qux'}));
});
test('anonymous function', t => {
	t.true(() => {});
});
test('generator function', t => {
	t.true(function * foo() {});
});

test('arguments formatted', t => {
	const args = (function () {
		return arguments;
	})('foo');
	t.true(args);
});
test('arguments diff', t => {
	const foo = (function () {
		return arguments;
	})('foo');
	const bar = (function () {
		return arguments;
	})('bar');
	t.deepEqual(foo, bar);
});
test('arguments diff with normal array', t => {
	const foo = (function () {
		return arguments;
	})('foo');
	t.deepEqual(foo, ['bar']);
});

if (formatGlobals) {
	test('global formatted', t => {
		t.true(global);
	});
	test('global diff', t => {
		t.deepEqual(global, {});
	});
}

test('object formatted', t => {
	const obj = {
		foo: 'bar'
	};
	t.true(obj);
});
test('object diff', t => {
	t.deepEqual({
		foo: 'bar'
	}, {
		baz: 'qux'
	});
});
test('object formatted, custom class', t => {
	class Foo {}
	const obj = new Foo();
	t.true(obj);
});
test('object formatted, no constructor', t => {
	class Foo {}
	const obj = new Foo();
	Object.defineProperty(obj, 'constructor', {});
	t.true(obj);
});
test('object formatted, non-Object string tag that does not match constructor', t => {
	class Foo extends Array {}
	const obj = new Foo();
	t.true(obj);
});

test('promise formatted', t => {
	const promise = Promise.resolve();
	t.true(promise);
});
test('promise diff', t => {
	t.deepEqual(Promise.resolve(), Promise.resolve());
});
test('promise diff, extra properties', t => {
	t.deepEqual(Promise.resolve(), Object.assign(Promise.resolve(), {foo: 'bar'}));
});

test('regexp formatted', t => {
	const regexp = /foo/gi;
	t.true(regexp);
});
test('regexp diff', t => {
	t.deepEqual(/foo/gi, /bar/gi);
});
test('regexp diff, extra properties', t => {
	t.deepEqual(/foo/gi, Object.assign(/foo/gi, {baz: 'qux'}));
});

test('set formatted', t => {
	const set = new Set([{foo: 'bar'}]);
	t.true(set);
});
test('set diff, string values', t => {
	t.deepEqual(new Set(['foo']), new Set(['bar']));
});
test('set diff, object values', t => {
	t.deepEqual(new Set([{foo: 'bar'}]), new Set([{bar: 'baz'}]));
});
test('set diff, distinct values', t => {
	t.deepEqual(new Set([{foo: 'bar'}]), new Set([null]));
});
test('set diff, extra properties', t => {
	t.deepEqual(new Set([{foo: 'bar'}]), Object.assign(new Set([{foo: 'bar'}]), {baz: 'qux'}));
});

test('buffer formatted', t => {
	const buffer = Buffer.from('decafba'.repeat(12), 'hex');
	t.true(buffer);
});
test('buffer diff', t => {
	t.deepEqual(Buffer.from('decafba'.repeat(12), 'hex'), Buffer.from('baddecaf', 'hex'));
});
test('buffer diff, extra properties', t => {
	t.deepEqual(Buffer.from('decafba'.repeat(12), 'hex'), Object.assign(Buffer.from('decafba'.repeat(12), 'hex'), {foo: 'bar'}));
});

test('primitives', t => {
	const primitives = [
		true,
		false,
		null,
		0,
		-0,
		42,
		Infinity,
		-Infinity,
		NaN,
		'foo',
		'foo\nbar',
		Symbol.iterator,
		Symbol.for('foo'),
		Symbol('bar'),
		undefined
	];
	t.true(primitives);
});

test('circular references', t => {
	const obj = {};
	obj.circular = obj;
	t.true(obj);
});

test('react element, formatted', t => {
	const element = React.createElement(HelloMessage, {name: 'Sindre'})
	t.true(element)
})
test('react element, complex attributes, formatted', t => {
	const element = React.createElement('div', {
		multiline: 'Hello\nworld',
		object: {foo: ['bar']}
	})
	t.true(element)
})
test('react element, opaque children, formatted', t => {
	const element = React.createElement('Foo', null, new Set(['foo']), true)
	t.true(element)
})
test('react element, diff', t => {
	const element = React.createElement(HelloMessage, {name: 'Sindre'})
	const other = React.createElement(HelloMessage, {name: 'Vadim'})
	t.deepEqual(element, other)
})

test('deep structure, formatted', t => {
	const deep = {
		foo: {
			bar: {
				baz: {
					qux: 'quux'
				}
			}
		}
	}
	t.true(deep)
})
test('deep structure, diff', t => {
	const deep = {
		foo: {
			bar: {
				baz: {
					qux: 'quux'
				}
			}
		}
	}
	t.deepEqual(deep, Object.assign({corge: 'grault'}, deep))
})
