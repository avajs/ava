'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

const path = require('path');
const React = require('react');
const test = require('tap').test;
const delay = require('delay');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const HelloMessage = require('./fixture/hello-message');

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';

class ContextRef {
	constructor() {
		this.value = {};
	}

	get() {
		return this.value;
	}

	set(newValue) {
		this.value = newValue;
	}
}

function ava(fn, contextRef) {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false},
		title: 'test'
	});
}

ava.failing = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: false, failing: true},
		title: 'test.failing'
	});
};

ava.cb = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true},
		title: 'test.cb'
	});
};

ava.cb.failing = (fn, contextRef) => {
	return new Test({
		contextRef: contextRef || new ContextRef(),
		failWithoutAssertions: true,
		fn,
		metadata: {type: 'test', callback: true, failing: true},
		title: 'test.cb.failing'
	});
};

test('run test', t => {
	return ava(a => {
		a.fail();
	}).run().then(result => {
		t.is(result.passed, false);
	});
});

test('multiple asserts', t => {
	const instance = ava(a => {
		a.pass();
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 3);
	});
});

test('plan assertions', t => {
	const instance = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 2);
		t.is(instance.assertCount, 2);
	});
});

test('plan assertion can be skipped', t => {
	const instance = ava(a => {
		a.plan.skip(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, null);
		t.is(instance.assertCount, 2);
	});
});

test('plan assertion skip() is bound', t => {
	const instance = ava(a => {
		(a.plan.skip)(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, null);
		t.is(instance.assertCount, 2);
	});
});

test('run more assertions than planned', t => {
	return ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
		a.pass();
	}).run().then(result => {
		t.is(result.passed, false);
		t.ok(result.error);
		t.match(result.error.message, /Planned for 2 assertions, but got 3\./);
		t.is(result.error.name, 'AssertionError');
	});
});

test('fails if no assertions are run', t => {
	return ava(() => {}).run().then(result => {
		t.is(result.passed, false);
		t.ok(result.error);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished without running any assertions/);
	});
});

test('fails if no assertions are run, unless so planned', t => {
	return ava(a => a.plan(0)).run().then(result => {
		t.is(result.passed, true);
	});
});

test('fails if no assertions are run, unless an ended callback test', t => {
	return ava.cb(a => a.end()).run().then(result => {
		t.is(result.passed, true);
	});
});

test('wrap non-assertion errors', t => {
	const err = new Error();
	return ava(() => {
		throw err;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Error thrown in test');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Error thrown in test:');
		t.match(result.error.values[0].formatted, /Error/);
	});
});

test('end can be used as callback without maintaining thisArg', t => {
	return ava.cb(a => {
		a.pass();
		setTimeout(a.end);
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('end can be used as callback with error', t => {
	const err = new Error('failed');
	return ava.cb(a => {
		a.end(err);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Callback called with an error');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Callback called with an error:');
		t.match(result.error.values[0].formatted, /.*Error.*\n.*message: 'failed'/);
	});
});

test('end can be used as callback with a non-error as its error argument', t => {
	const nonError = {foo: 'bar'};
	return ava.cb(a => {
		a.end(nonError);
	}).run().then(result => {
		t.is(result.passed, false);
		t.ok(result.error);
		t.is(result.error.message, 'Callback called with an error');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Callback called with an error:');
		t.match(result.error.values[0].formatted, /.*\{.*\n.*foo: 'bar'/);
	});
});

test('title returns the test title', t => {
	t.plan(1);
	return new Test({
		fn(a) {
			t.is(a.title, 'foo');
			a.pass();
		},
		metadata: {type: 'test', callback: false},
		title: 'foo'
	}).run();
});

test('handle non-assertion errors even when planned', t => {
	const err = new Error('bar');
	return ava(a => {
		a.plan(1);
		throw err;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.message, 'Error thrown in test');
	});
});

test('handle testing of arrays', t => {
	const instance = ava(a => {
		a.deepEqual(['foo', 'bar'], ['foo', 'bar']);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle falsy testing of arrays', t => {
	const instance = ava(a => {
		a.notDeepEqual(['foo', 'bar'], ['foo', 'bar', 'cat']);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle testing of objects', t => {
	const instance = ava(a => {
		a.deepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar'
		});
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('handle falsy testing of objects', t => {
	const instance = ava(a => {
		a.notDeepEqual({
			foo: 'foo',
			bar: 'bar'
		}, {
			foo: 'foo',
			bar: 'bar',
			cat: 'cake'
		});
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('planned async assertion', t => {
	const instance = ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('async assertion with `.end()`', t => {
	const instance = ava.cb(a => {
		setTimeout(() => {
			a.pass();
			a.end();
		}, 100);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.assertCount, 1);
	});
});

test('more assertions than planned should emit an assertion error', t => {
	return ava(a => {
		a.plan(1);
		a.pass();
		a.pass();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
	});
});

test('record test duration', t => {
	return ava.cb(a => {
		a.plan(1);

		setTimeout(() => {
			a.true(true);
			a.end();
		}, 1234);
	}).run().then(result => {
		t.is(result.passed, true);
		t.true(result.duration >= 1000);
	});
});

test('wait for test to end', t => {
	const instance = ava.cb(a => {
		a.plan(1);
		setTimeout(() => {
			a.pass();
			a.end();
		}, 1234);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 1);
		t.is(instance.assertCount, 1);
		t.true(result.duration >= 1000);
	});
});

test('fails with the first assertError', t => {
	return ava(a => {
		a.plan(2);
		a.is(1, 2);
		a.is(3, 4);
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Difference:');
		t.match(result.error.values[0].formatted, /- 1\n\+ 2/);
	});
});

test('failing pending assertion causes test to fail, not promise rejection', t => {
	return ava(a => {
		return a.throws(Promise.resolve()).then(() => {
			throw new Error('Should be ignored');
		});
	}).run().then(result => {
		t.is(result.passed, false);
		t.notMatch(result.error.message, /Rejected promise returned by test/);
	});
});

test('fails with thrown falsy value', t => {
	return ava(() => {
		throw 0; // eslint-disable-line no-throw-literal
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Error thrown in test');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Error thrown in test:');
		t.match(result.error.values[0].formatted, /0/);
	});
});

test('fails with thrown non-error object', t => {
	const obj = {foo: 'bar'};
	return ava(() => {
		throw obj;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Error thrown in test');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Error thrown in test:');
		t.match(result.error.values[0].formatted, /.*\{.*\n.*foo: 'bar'/);
	});
});

test('skipped assertions count towards the plan', t => {
	const instance = ava(a => {
		a.plan(15);
		a.pass.skip();
		a.fail.skip();
		a.is.skip(1, 1);
		a.not.skip(1, 2);
		a.deepEqual.skip({foo: 'bar'}, {foo: 'bar'});
		a.notDeepEqual.skip({foo: 'bar'}, {baz: 'thud'});
		a.throws.skip(() => {
			throw new Error(); // eslint-disable-line unicorn/error-message
		});
		a.notThrows.skip(() => {});
		a.snapshot.skip({});
		a.truthy.skip(true);
		a.falsy.skip(false);
		a.true.skip(true);
		a.false.skip(false);
		a.regex.skip('foo', /foo/);
		a.notRegex.skip('bar', /foo/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 15);
		t.is(instance.assertCount, 15);
	});
});

test('assertion.skip() is bound', t => {
	const instance = ava(a => {
		a.plan(15);
		(a.pass.skip)();
		(a.fail.skip)();
		(a.is.skip)(1, 1);
		(a.not.skip)(1, 2);
		(a.deepEqual.skip)({foo: 'bar'}, {foo: 'bar'});
		(a.notDeepEqual.skip)({foo: 'bar'}, {baz: 'thud'});
		(a.throws.skip)(() => {
			throw new Error(); // eslint-disable-line unicorn/error-message
		});
		(a.notThrows.skip)(() => {});
		(a.snapshot.skip)({});
		(a.truthy.skip)(true);
		(a.falsy.skip)(false);
		(a.true.skip)(true);
		(a.false.skip)(false);
		(a.regex.skip)('foo', /foo/);
		(a.notRegex.skip)('bar', /foo/);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 15);
		t.is(instance.assertCount, 15);
	});
});

test('throws and notThrows work with promises', t => {
	let asyncCalled = false;
	const instance = ava(a => {
		a.plan(2);
		return Promise.all([
			a.throws(delay.reject(10, new Error('foo')), 'foo'),
			a.notThrows(delay(20).then(() => {
				asyncCalled = true;
			}))
		]);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 2);
		t.is(instance.assertCount, 2);
		t.is(asyncCalled, true);
	});
});

test('end should not be called multiple times', t => {
	return ava.cb(a => {
		a.pass();
		a.end();
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, '`t.end()` called more than once');
	});
});

test('cb test that throws sync', t => {
	const err = new Error('foo');
	return ava.cb(() => {
		throw err;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Error thrown in test');
		t.is(result.error.name, 'AssertionError');
	});
});

test('multiple resolving and rejecting promises passed to t.throws/t.notThrows', t => {
	const instance = ava(a => {
		a.plan(6);
		const promises = [];
		for (let i = 0; i < 3; i++) {
			promises.push(
				a.throws(delay.reject(10, new Error('foo')), 'foo'),
				a.notThrows(delay(10), 'foo')
			);
		}
		return Promise.all(promises);
	});
	return instance.run().then(result => {
		t.is(result.passed, true);
		t.is(instance.planCount, 6);
		t.is(instance.assertCount, 6);
	});
});

test('fails if test ends while there are pending assertions', t => {
	return ava(a => {
		a.throws(Promise.reject(new Error()));
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished, but an assertion is still pending/);
	});
});

test('fails if callback test ends while there are pending assertions', t => {
	return ava.cb(a => {
		a.throws(Promise.reject(new Error()));
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished, but an assertion is still pending/);
	});
});

test('fails if async test ends while there are pending assertions', t => {
	return ava(a => {
		a.throws(Promise.reject(new Error()));
		return Promise.resolve();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished, but an assertion is still pending/);
	});
});

// This behavior is incorrect, but feedback cannot be provided to the user due to
// https://github.com/avajs/ava/issues/1330
test('no crash when adding assertions after the test has ended', t => {
	t.plan(3);

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.pass());
		});
	}).run();

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.fail());
		});
	}).run();

	ava(a => {
		a.pass();
		setImmediate(() => {
			t.doesNotThrow(() => a.notThrows(Promise.resolve()));
		});
	}).run();
});

test('contextRef', t => {
	new Test({
		contextRef: {
			get() {
				return {foo: 'bar'};
			}
		},
		failWithoutAssertions: true,
		fn(a) {
			a.pass();
			t.strictDeepEqual(a.context, {foo: 'bar'});
			t.end();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo'
	}).run();
});

test('failing tests should fail', t => {
	return ava.failing('foo', a => {
		a.fail();
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing callback tests should end without error', t => {
	const err = new Error('failed');
	return ava.cb.failing(a => {
		a.end(err);
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing tests must not pass', t => {
	return ava.failing(a => {
		a.pass();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, failingTestHint);
	});
});

test('failing callback tests must not pass', t => {
	return ava.cb.failing(a => {
		a.pass();
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
	});
});

test('failing tests must not return a fulfilled promise', t => {
	return ava.failing(a => {
		return Promise.resolve().then(() => a.pass());
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, failingTestHint);
	});
});

test('failing tests pass when returning a rejected promise', t => {
	return ava.failing(a => {
		a.plan(1);
		return a.notThrows(delay(10), 'foo').then(() => Promise.reject());
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing tests pass with `t.throws(nonThrowingPromise)`', t => {
	return ava.failing(a => {
		return a.throws(Promise.resolve(10));
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing tests fail with `t.notThrows(throws)`', t => {
	return ava.failing(a => {
		return a.notThrows(Promise.resolve('foo'));
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, failingTestHint);
	});
});

test('log from tests', t => {
	return ava(a => {
		a.log('a log message from a test');
		t.true(true);
		a.log('another log message from a test');
		a.log({b: 1, c: {d: 2}}, 'complex log', 5, 5.1);
		a.log();
		(a.log)('bound');
	}).run().then(result => {
		t.deepEqual(
			result.logs,
			[
				'a log message from a test',
				'another log message from a test',
				'{\n  b: 1,\n  c: {\n    d: 2,\n  },\n} complex log 5 5.1',
				'bound'
			]
		);
	});
});

test('assertions are bound', t => {
	// This does not test .fail() and .snapshot(). It'll suffice.
	return ava(a => {
		(a.plan)(13);
		(a.pass)();
		(a.is)(1, 1);
		(a.not)(1, 2);
		(a.deepEqual)({foo: 'bar'}, {foo: 'bar'});
		(a.notDeepEqual)({foo: 'bar'}, {baz: 'thud'});
		(a.throws)(() => {
			throw new Error(); // eslint-disable-line unicorn/error-message
		});
		(a.notThrows)(() => {});
		(a.truthy)(true);
		(a.falsy)(false);
		(a.true)(true);
		(a.false)(false);
		(a.regex)('foo', /foo/);
		(a.notRegex)('bar', /foo/);
	}).run().then(result => {
		t.true(result.passed);
	});
});

// Snapshots reused from test/assert.js
test('snapshot assertion can be skipped', t => {
	const projectDir = path.join(__dirname, 'fixture');
	const manager = snapshotManager.load({
		file: __filename,
		name: 'assert.js',
		projectDir,
		relFile: 'test/assert.js',
		fixedLocation: null,
		testDir: projectDir,
		updating: false
	});

	return new Test({
		compareTestSnapshot: options => manager.compare(options),
		updateSnapshots: false,
		metadata: {},
		title: 'passes',
		fn(t) {
			t.snapshot.skip({not: {a: 'match'}});
			t.snapshot(React.createElement(HelloMessage, {name: 'Sindre'}));
		}
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('snapshot assertion cannot be skipped when updating snapshots', t => {
	return new Test({
		updateSnapshots: true,
		metadata: {},
		title: 'passes',
		fn(t) {
			t.snapshot.skip({not: {a: 'match'}});
		}
	}).run().then(result => {
		t.false(result.passed);
		t.is(result.error.message, 'Snapshot assertions cannot be skipped when updating snapshots');
	});
});

test('implementation runs with null scope', t => {
	return ava(function (a) {
		a.pass();
		t.is(this, null);
	}).run();
});
