'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

const path = require('path');
const React = require('react');
const {test} = require('tap');
const delay = require('delay');
const snapshotManager = require('../lib/snapshot-manager');
const Test = require('../lib/test');
const HelloMessage = require('./fixture/hello-message');
const {ava} = require('./helper/ava-test');

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
			a.throwsAsync(delay.reject(10, {value: new Error('foo')}), 'foo'),
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
				a.throwsAsync(delay.reject(10, {value: new Error('foo')}), 'foo'),
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
		file: path.join(projectDir, 'assert.js'),
		projectDir,
		fixedLocation: null,
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

test('try-commit are present', t => {
	return ava(a => {
		a.pass();
		t.type(a.try, Function);
	}).run();
});

test('try-commit works', t => {
	const instance = ava(a => {
		return a
			.try(b => b.pass())
			.then(res => {
				t.true(res.passed);
				res.commit();
			});
	});

	return instance.run()
		.then(result => {
			t.true(result.passed);
			t.is(instance.assertCount, 1);
		});
});

test('try-commit discards failed attempt', t => {
	return ava(a => {
		return a
			.try(b => b.fail())
			.then(res => res.discard())
			.then(() => a.pass());
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit can discard produced result', t => {
	return ava(a => {
		return a
			.try(b => b.pass())
			.then(res => {
				res.discard();
			});
	}).run().then(result => {
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /without running any assertions/);
		t.is(result.error.name, 'Error');
	});
});

test('try-commit fails when not all assertions were committed/discarded', t => {
	return ava(a => {
		a.pass();
		return a.try(b => b.pass());
	}).run().then(result => {
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /not all attempts were committed/);
		t.is(result.error.name, 'Error');
	});
});

test('try-commit works with values', t => {
	const testValue1 = 123;
	const testValue2 = 123;

	return ava(a => {
		return a
			.try((b, val1, val2) => {
				b.is(val1, val2);
			}, testValue1, testValue2)
			.then(res => {
				t.true(res.passed);
				res.commit();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit is properly counted', t => {
	const instance = ava(a => {
		return a
			.try(b => {
				b.is(1, 1);
				b.is(2, 2);
				b.pass();
			})
			.then(res => {
				t.true(res.passed);
				t.is(instance.pendingAttemptCount, 1);
				res.commit();
				t.is(instance.pendingAttemptCount, 0);
			});
	});

	return instance.run().then(result => {
		t.true(result.passed);
		t.is(instance.assertCount, 3);
	});
});

test('try-commit is properly counted multiple', t => {
	const instance = ava(a => {
		return Promise.all([
			a.try(b => b.pass()),
			a.try(b => b.pass()),
			a.try(b => b.pass())
		])
			.then(([res1, res2, res3]) => {
				t.is(instance.pendingAttemptCount, 3);
				res1.commit();
				res2.discard();
				res3.commit();
				t.is(instance.pendingAttemptCount, 0);
			});
	});

	return instance.run().then(result => {
		t.true(result.passed);
		t.is(instance.assertCount, 2);
	});
});

test('try-commit goes as many levels', t => {
	t.plan(5);
	const instance = ava(a => {
		t.ok(a.try);
		return a
			.try(b => {
				t.ok(b.try);
				return b
					.try(c => {
						t.ok(c.try);
						c.pass();
					})
					.then(res => {
						res.commit();
					});
			})
			.then(res => {
				res.commit();
			});
	});

	return instance.run().then(result => {
		t.true(result.passed);
		t.is(instance.assertCount, 1);
	});
});

test('try-commit fails when not committed', t => {
	return ava(a => {
		return a
			.try(b => b.pass())
			.then(res => {
				t.true(res.passed);
			});
	}).run().then(result => {
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /not all attempts were committed/);
		t.is(result.error.name, 'Error');
	});
});

test('try-commit fails when no assertions inside try', t => {
	return ava(a => {
		return a
			.try(() => {})
			.then(res => {
				t.false(res.passed);
				t.ok(res.errors);
				t.is(res.errors.length, 1);
				const error = res.errors[0];
				t.match(error.message, /Test finished without running any assertions/);
				t.is(error.name, 'Error');
				res.commit();
			});
	}).run().then(result => {
		t.false(result.passed);
	});
});

test('try-commit fails when no assertions inside multiple try', t => {
	return ava(a => {
		return Promise.all([
			a.try(b => b.pass()).then(res1 => {
				res1.commit();
				t.true(res1.passed);
			}),
			a.try(() => {}).then(res2 => {
				t.false(res2.passed);
				t.ok(res2.errors);
				t.is(res2.errors.length, 1);
				const error = res2.errors[0];
				t.match(error.message, /Test finished without running any assertions/);
				t.is(error.name, 'Error');
				res2.commit();
			})
		]);
	}).run().then(result => {
		t.false(result.passed);
	});
});

test('test fails when try-commit committed to failed state', t => {
	return ava(a => {
		return a.try(b => b.fail()).then(res => {
			t.false(res.passed);
			res.commit();
		});
	}).run().then(result => {
		t.false(result.passed);
	});
});

test('try-commit has proper titles, when going in depth and width', t => {
	t.plan(6);
	return new Test({
		fn(a) {
			t.is(a.title, 'foo');

			return Promise.all([
				a.try(b => {
					t.is(b.title, 'foo.A0');
					return Promise.all([
						b.try(c => t.is(c.title, 'foo.A0.A0')),
						b.try(c => t.is(c.title, 'foo.A0.A1'))
					]);
				}),
				a.try(b => t.is(b.title, 'foo.A1')),
				a.try(b => t.is(b.title, 'foo.A2'))
			]);
		},
		failWithoutAssertions: false,
		metadata: {type: 'test', callback: false},
		title: 'foo'
	}).run();
});

test('try-commit does not fail when calling commit twice', t => {
	return ava(a => {
		return a.try(b => b.pass()).then(res => {
			res.commit();
			res.commit();
		});
	}).run().then(result => {
		t.true(result.passed);
		t.false(result.error);
	});
});

test('try-commit does not fail when calling discard twice', t => {
	return ava(a => {
		return a.try(b => b.pass()).then(res => {
			res.discard();
			res.discard();
		});
	}).run().then(result => {
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /Test finished without running any assertions/);
		t.is(result.error.name, 'Error');
	});
});

test('try-commit allows planning inside the try', t => {
	return ava(a => {
		return a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
			b.pass();
		}).then(res => {
			t.true(res.passed);
			res.commit();
		});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit fails when plan is not reached inside the try', t => {
	return ava(a => {
		return a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
		}).then(res => {
			t.false(res.passed);
			res.commit();
		});
	}).run().then(result => {
		t.false(result.passed);
	});
});

test('try-commit passes with failing test', t => {
	return ava.failing(a => {
		return a
			.try(b => b.fail())
			.then(res => {
				t.false(res.passed);
				t.ok(res.errors);
				t.is(res.errors.length, 1);
				const error = res.errors[0];
				t.match(error.message, /Test failed via `t\.fail\(\)`/);
				t.is(error.name, 'AssertionError');
				res.commit();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit works with callback test', t => {
	return ava.cb(a => {
		a
			.try(b => b.pass())
			.then(res => {
				res.commit();
				a.end();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit works with failing callback test', t => {
	return ava.cb.failing(a => {
		a
			.try(b => b.fail())
			.then(res => {
				t.false(res.passed);
				t.ok(res.errors);
				t.is(res.errors.length, 1);
				const error = res.errors[0];
				t.match(error.message, /Test failed via `t\.fail\(\)`/);
				t.is(error.name, 'AssertionError');
				res.commit();
			})
			.then(() => {
				a.end();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit does not allow to use .end() in attempt when parent is callback test', t => {
	return ava.cb(a => {
		a
			.try(b => {
				b.pass();
				b.end();
			})
			.then(res => {
				res.commit();
				a.end();
			});
	}).run().then(result => {
		t.false(result.passed);
		t.ok(result.error);
		t.match(result.error.message, /Error thrown in test/);
		t.is(result.error.name, 'AssertionError');
		t.match(result.error.values[0].formatted, /t\.end.*not supported/);
		t.match(result.error.values[0].formatted, /return promise for asynchronous attempt/);
	});
});

test('try-commit can be discarded', t => {
	const instance = ava(a => {
		const p = a.try(b => {
			return new Promise(resolve => setTimeout(resolve, 500))
				.then(() => b.pass());
		});

		p.discard();

		return p.then(res => {
			t.is(res, null);
		});
	});

	return instance.run().then(result => {
		t.false(result.passed);
		t.is(instance.assertCount, 0);
	});
});

test('try-commit accepts macros', t => {
	const macro = b => {
		t.is(b.title, ' Title');
		b.pass();
	};

	macro.title = providedTitle => `${providedTitle ? providedTitle : ''} Title`;

	return ava(a => {
		return a
			.try(macro)
			.then(res => {
				t.true(res.passed);
				res.commit();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit accepts multiple macros', t => {
	const macros = [b => b.pass(), b => b.fail()];
	return ava(a => {
		return a.try(macros)
			.then(([res1, res2]) => {
				t.true(res1.passed);
				res1.commit();
				t.false(res2.passed);
				res2.discard();
			});
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit returns results in the same shape as when implementations are passed', t => {
	return ava(a => {
		return Promise.all([
			a.try(b => b.pass()).then(results => {
				t.match(results, {passed: true});
				results.commit();
			}),
			a.try([b => b.pass()]).then(results => {
				t.is(results.length, 1);
				t.match(results, [{passed: true}]);
				results[0].commit();
			}),
			a.try([b => b.pass(), b => b.fail()]).then(results => {
				t.is(results.length, 2);
				t.match(results, [{passed: true}, {passed: false}]);
				results[0].commit();
				results[1].discard();
			})
		]);
	}).run().then(result => {
		t.true(result.passed);
	});
});

test('try-commit abides timeout', t => {
	return ava(a => {
		a.timeout(10);
		return a.try(b => {
			b.pass();
			return delay(200);
		}).then(result => result.commit());
	}).run().then(result => {
		t.is(result.passed, false);
		t.match(result.error.message, /timeout/);
	});
});

test('try-commit refreshes the timeout on commit/discard', t => {
	return ava.cb(a => {
		a.timeout(10);
		a.plan(3);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 5);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 10);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 15);
		setTimeout(() => a.end(), 20);
	}).run().then(result => {
		t.is(result.passed, true);
	});
});
