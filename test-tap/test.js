'use strict';
require('../lib/chalk').set({level: 0});
require('../lib/worker/options').set({});

const path = require('path');
const {test} = require('tap');
const sinon = require('sinon');
const delay = require('delay');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const {ava, withExperiments} = require('./helper/ava-test');

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';

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
		t.match(result.error.values[0].formatted, /.*{.*\n.*foo: 'bar'/);
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
		return a.throwsAsync(Promise.resolve()).then(() => {
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
	const object = {foo: 'bar'};
	return ava(() => {
		throw object;
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.message, 'Error thrown in test');
		t.is(result.error.name, 'AssertionError');
		t.is(result.error.values.length, 1);
		t.is(result.error.values[0].label, 'Error thrown in test:');
		t.match(result.error.values[0].formatted, /.*{.*\n.*foo: 'bar'/);
	});
});

test('skipped assertions count towards the plan', t => {
	const instance = ava(a => {
		a.plan(16);
		a.pass.skip();
		a.fail.skip();
		a.is.skip(1, 1);
		a.not.skip(1, 2);
		a.deepEqual.skip({foo: 'bar'}, {foo: 'bar'});
		a.notDeepEqual.skip({foo: 'bar'}, {baz: 'thud'});
		a.like.skip({foo: 'bar'}, {foo: 'bar'});
		a.throws.skip(() => {
			throw new Error();
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
		t.is(instance.planCount, 16);
		t.is(instance.assertCount, 16);
	});
});

test('assertion.skip() is bound', t => {
	const instance = ava(a => {
		a.plan(16);
		(a.pass.skip)();
		(a.fail.skip)();
		(a.is.skip)(1, 1);
		(a.not.skip)(1, 2);
		(a.deepEqual.skip)({foo: 'bar'}, {foo: 'bar'});
		(a.notDeepEqual.skip)({foo: 'bar'}, {baz: 'thud'});
		(a.like.skip)({foo: 'bar'}, {foo: 'bar'});
		(a.throws.skip)(() => {
			throw new Error();
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
		t.is(instance.planCount, 16);
		t.is(instance.assertCount, 16);
	});
});

test('throws and notThrows work with promises', t => {
	let asyncCalled = false;
	const instance = ava(a => {
		a.plan(2);
		return Promise.all([
			a.throwsAsync(delay.reject(10, {value: new Error('foo')}), {message: 'foo'}),
			a.notThrowsAsync(delay(20).then(() => {
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
				a.throwsAsync(delay.reject(10, {value: new Error('foo')}), {message: 'foo'}),
				a.notThrowsAsync(delay(10))
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
		a.throwsAsync(Promise.reject(new Error()));
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished, but an assertion is still pending/);
	});
});

test('fails if callback test ends while there are pending assertions', t => {
	return ava.cb(a => {
		a.throwsAsync(Promise.reject(new Error()));
		a.end();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'Error');
		t.match(result.error.message, /Test finished, but an assertion is still pending/);
	});
});

test('fails if async test ends while there are pending assertions', t => {
	return ava(a => {
		a.throwsAsync(Promise.reject(new Error()));
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
			t.doesNotThrow(() => a.notThrowsAsync(Promise.resolve()));
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
	const error = new Error('failed');
	return ava.cb.failing(a => {
		a.end(error);
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
		return a.notThrowsAsync(delay(10), {value: 'foo'}).then(() => Promise.reject());
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing tests pass with `t.throwsAsync(nonThrowingPromise)`', t => {
	return ava.failing(a => {
		return a.throwsAsync(Promise.resolve(10));
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('failing tests fail with `t.notThrowsAsync(throws)`', t => {
	return ava.failing(a => {
		return a.notThrowsAsync(Promise.resolve('foo'));
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
		(a.plan)(14);
		(a.pass)();
		(a.is)(1, 1);
		(a.not)(1, 2);
		(a.deepEqual)({foo: 'bar'}, {foo: 'bar'});
		(a.notDeepEqual)({foo: 'bar'}, {baz: 'thud'});
		(a.like)({foo: 'bar'}, {foo: 'bar'});
		(a.throws)(() => {
			throw new Error();
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
		file: path.join(projectDir, 'assert.js'),
		projectDir,
		fixedLocation: null,
		recordNewSnapshots: true,
		updating: false
	});

	return new Test({
		compareTestSnapshot: options => manager.compare(options),
		updateSnapshots: false,
		metadata: {},
		title: 'passes',
		fn(t) {
			t.snapshot.skip({not: {a: 'match'}});
			t.snapshot.skip({not: {b: 'match'}});
			t.snapshot({name: 'Sindre'});
		}
	}).run().then(result => {
		t.true(result.passed);
	});
});

// Snapshots reused from test/assert.js
test('snapshot assertions call options.skipSnapshot when skipped', async t => {
	const projectDir = path.join(__dirname, 'fixture');
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'assert.js'),
		projectDir,
		fixedLocation: null,
		updating: false
	});

	const skipSnapshot = sinon.spy();

	const test = new Test({
		compareTestSnapshot: options => manager.compare(options),
		skipSnapshot,
		updateSnapshots: false,
		metadata: {},
		title: 'passes',
		fn(t) {
			t.snapshot.skip({not: {a: 'match'}});
			t.snapshot.skip({not: {b: 'match'}});
			t.snapshot({name: 'Sindre'});
		}
	});

	await test.run();

	t.true(skipSnapshot.calledTwice);
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

test('timeout with promise', t => {
	return ava(a => {
		a.timeout(10);
		return delay(200);
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.error.message, /timeout/);
	});
});

test('timeout with cb', t => {
	return ava.cb(a => {
		a.timeout(10);
		setTimeout(() => a.end(), 200);
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.error.message, /timeout/);
	});
});

test('timeout is refreshed on assert', t => {
	return ava.cb(a => {
		a.timeout(10);
		a.plan(3);
		setTimeout(() => a.pass(), 5);
		setTimeout(() => a.pass(), 10);
		setTimeout(() => a.pass(), 15);
		setTimeout(() => a.end(), 20);
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('teardown passing test', t => {
	const teardown = sinon.spy();
	return ava(a => {
		a.teardown(teardown);
		a.pass();
	}).run().then(result => {
		t.is(result.passed, true);
		t.ok(teardown.calledOnce);
	});
});

test('teardown failing test', t => {
	const teardown = sinon.spy();
	return ava(a => {
		a.teardown(teardown);
		a.fail();
	}).run().then(result => {
		t.is(result.passed, false);
		t.ok(teardown.calledOnce);
	});
});

test('teardown awaits promise', t => {
	let tornDown = false;
	const teardownPromise = delay(200).then(() => {
		tornDown = true;
	});
	return ava(a => {
		a.teardown(() => teardownPromise);
		a.pass();
	}).run().then(result => {
		t.is(result.passed, true);
		t.ok(tornDown);
	});
});

test('teardowns run sequentially in order', t => {
	const teardownA = sinon.stub().resolves(delay(200));
	let resolveB;
	const teardownB = sinon.stub().returns(new Promise(resolve => {
		resolveB = resolve;
	}));
	return ava(a => {
		a.teardown(() => teardownA().then(resolveB));
		a.teardown(teardownB);
		a.pass();
	}).run().then(result => {
		t.is(result.passed, true);
		t.ok(teardownA.calledBefore(teardownB));
	});
});

test('teardowns run in reverse order when the `reverseTeardowns` experimental feature is enabled', t => {
	let resolveA;
	const teardownA = sinon.stub().returns(new Promise(resolve => {
		resolveA = resolve;
	}));
	const teardownB = sinon.stub().resolves(delay(200));

	return withExperiments({reverseTeardowns: true})(a => {
		a.teardown(teardownA);
		a.teardown(() => teardownB().then(resolveA));
		a.pass();
	}).run().then(result => {
		t.is(result.passed, true);
		t.ok(teardownB.calledBefore(teardownA));
	});
});

test('teardown with cb', t => {
	const teardown = sinon.spy();
	return ava.cb(a => {
		a.teardown(teardown);
		setTimeout(() => {
			a.pass();
			a.end();
		});
	}).run().then(result => {
		t.is(result.passed, true);
		t.ok(teardown.calledOnce);
	});
});

test('teardown without function callback fails', t => {
	return ava(a => {
		return a.throwsAsync(async () => {
			a.teardown(false);
		}, {message: 'Expected a function'});
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('teardown errors fail the test', t => {
	const teardown = sinon.stub().throws('TeardownError');
	return ava(a => {
		a.teardown(teardown);
		a.pass();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'TeardownError');
		t.ok(teardown.calledOnce);
	});
});

test('teardown errors are hidden behind assertion errors', t => {
	const teardown = sinon.stub().throws('TeardownError');
	return ava(a => {
		a.teardown(teardown);
		a.fail();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'AssertionError');
		t.ok(teardown.calledOnce);
	});
});

test('teardowns errors do not stop next teardown from running', t => {
	const teardownA = sinon.stub().throws('TeardownError');
	const teardownB = sinon.spy();
	return ava(a => {
		a.teardown(teardownA);
		a.teardown(teardownB);
		a.pass();
	}).run().then(result => {
		t.is(result.passed, false);
		t.is(result.error.name, 'TeardownError');
		t.ok(teardownA.calledOnce);
		t.ok(teardownB.calledOnce);
		t.ok(teardownA.calledBefore(teardownB));
	});
});

test('teardowns cannot be registered by teardowns', async t => {
	const result = await ava(a => {
		a.teardown(() => {
			a.teardown(() => {});
		});
		a.pass();
	}).run();
	t.is(result.passed, false);
	t.match(result.error.message, /cannot be used during teardown/);
});

test('.log() is bound', t => {
	return ava(a => {
		const {log} = a;
		[1, 2, 3].forEach(value => {
			log('value: ' + value);
		});
		['value foo', 'value bar'].forEach(value => log(value));
	}).run().then(result => {
		t.deepEqual(result.logs, [
			'value: 1',
			'value: 2',
			'value: 3',
			'value foo',
			'value bar'
		]);
	});
});

test('.plan() is bound', t => {
	return ava(a => {
		const {plan} = a;
		plan(3);

		a.pass();
		a.is(2, 2);
		a.truthy('string');
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('.timeout() is bound', t => {
	return ava(a => {
		const {timeout} = a;
		timeout(10);
		a.pass();
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('.end() is bound', t => {
	return ava.cb(a => {
		const {end} = a;
		a.pass();
		end();
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('.teardown() is bound', t => {
	const teardownCallback = sinon.spy();
	return ava(a => {
		const {teardown} = a;
		teardown(teardownCallback);
		a.pass();
	}).run().then(result => {
		t.true(result.passed);
		t.ok(teardownCallback.calledOnce);
	});
});

test('t.passed value is true when teardown callback is executed for passing test', t => {
	new Test({
		fn(a) {
			a.teardown(() => {
				t.is(a.passed, true);
				t.end();
			});
			a.pass();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo'
	}).run();
});

test('t.passed value is false when teardown callback is executed for failing test', t => {
	new Test({
		fn(a) {
			a.teardown(() => {
				t.is(a.passed, false);
				t.end();
			});
			a.fail();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo'
	}).run();
});
