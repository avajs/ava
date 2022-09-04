import path from 'node:path';
import {fileURLToPath} from 'node:url';

import ciInfo from 'ci-info';
import delay from 'delay';
import sinon from 'sinon';
import {test} from 'tap';

import './helper/chalk0.js'; // eslint-disable-line import/no-unassigned-import
import * as snapshotManager from '../lib/snapshot-manager.js';
import Test from '../lib/test.js';
import {set as setOptions} from '../lib/worker/options.cjs';

import {ava} from './helper/ava-test.js';

setOptions({});

const failingTestHint = 'Test was expected to fail, but succeeded, you should stop marking the test as failing';

test('run test', t => ava(a => {
	a.fail();
}).run().then(result => {
	t.equal(result.passed, false);
}));

test('multiple asserts', t => {
	const instance = ava(a => {
		a.pass();
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.assertCount, 3);
	});
});

test('plan assertions', t => {
	const instance = ava(a => {
		a.plan(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.planCount, 2);
		t.equal(instance.assertCount, 2);
	});
});

test('plan assertion can be skipped', t => {
	const instance = ava(a => {
		a.plan.skip(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.planCount, null);
		t.equal(instance.assertCount, 2);
	});
});

test('plan assertion skip() is bound', t => {
	const instance = ava(a => {
		(a.plan.skip)(2);
		a.pass();
		a.pass();
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.planCount, null);
		t.equal(instance.assertCount, 2);
	});
});

test('run more assertions than planned', t => ava(a => {
	a.plan(2);
	a.pass();
	a.pass();
	a.pass();
}).run().then(result => {
	t.equal(result.passed, false);
	t.ok(result.error);
	t.match(result.error.message, /Planned for 2 assertions, but got 3\./);
	t.equal(result.error.name, 'AssertionError');
}));

test('fails if no assertions are run', t => ava(() => {}).run().then(result => {
	t.equal(result.passed, false);
	t.ok(result.error);
	t.equal(result.error.name, 'Error');
	t.match(result.error.message, /Test finished without running any assertions/);
}));

test('fails if no assertions are run, unless so planned', t => ava(a => a.plan(0)).run().then(result => {
	t.equal(result.passed, true);
}));

test('wrap non-assertion errors', t => {
	const error = new Error();
	return ava(() => {
		throw error;
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.message, 'Error thrown in test');
		t.equal(result.error.name, 'AssertionError');
		t.equal(result.error.values.length, 1);
		t.equal(result.error.values[0].label, 'Error thrown in test:');
		t.match(result.error.values[0].formatted, /Error/);
	});
});

test('title returns the test title', t => {
	t.plan(1);
	return new Test({
		fn(a) {
			t.equal(a.title, 'foo');
			a.pass();
		},
		metadata: {type: 'test'},
		title: 'foo',
	}).run();
});

test('handle non-assertion errors even when planned', t => {
	const error = new Error('bar');
	return ava(a => {
		a.plan(1);
		throw error;
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.name, 'AssertionError');
		t.equal(result.error.message, 'Error thrown in test');
	});
});

test('handle testing of arrays', t => {
	const instance = ava(a => {
		a.deepEqual(['foo', 'bar'], ['foo', 'bar']);
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.assertCount, 1);
	});
});

test('handle falsy testing of arrays', t => {
	const instance = ava(a => {
		a.notDeepEqual(['foo', 'bar'], ['foo', 'bar', 'cat']);
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.assertCount, 1);
	});
});

test('handle testing of objects', t => {
	const instance = ava(a => {
		a.deepEqual({
			foo: 'foo',
			bar: 'bar',
		}, {
			foo: 'foo',
			bar: 'bar',
		});
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.assertCount, 1);
	});
});

test('handle falsy testing of objects', t => {
	const instance = ava(a => {
		a.notDeepEqual({
			foo: 'foo',
			bar: 'bar',
		}, {
			foo: 'foo',
			bar: 'bar',
			cat: 'cake',
		});
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.assertCount, 1);
	});
});

test('more assertions than planned should emit an assertion error', t => ava(a => {
	a.plan(1);
	a.pass();
	a.pass();
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.name, 'AssertionError');
}));

test('record test duration', t => ava(async a => {
	await delay(1234);
	a.pass();
}).run().then(result => {
	t.equal(result.passed, true);
	t.ok(result.duration >= 1000);
}));

test('fails with the first assertError', t => ava(a => {
	a.plan(2);
	a.is(1, 2);
	a.is(3, 4);
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.name, 'AssertionError');
	t.equal(result.error.values.length, 1);
	t.equal(result.error.values[0].label, 'Difference (- actual, + expected):');
	t.match(result.error.values[0].formatted, /- 1\n\+ 2/);
}));

test('failing pending assertion causes test to fail, not promise rejection', t => ava(a => a.throwsAsync(Promise.resolve()).then(() => {
	throw new Error('Should be ignored');
})).run().then(result => {
	t.equal(result.passed, false);
	t.notMatch(result.error.message, /Rejected promise returned by test/);
}));

test('fails with thrown falsy value', t => ava(() => {
	throw 0; // eslint-disable-line no-throw-literal
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.message, 'Error thrown in test');
	t.equal(result.error.name, 'AssertionError');
	t.equal(result.error.values.length, 1);
	t.equal(result.error.values[0].label, 'Error thrown in test:');
	t.match(result.error.values[0].formatted, /0/);
}));

test('fails with thrown non-error object', t => {
	const object = {foo: 'bar'};
	return ava(() => {
		throw object;
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.message, 'Error thrown in test');
		t.equal(result.error.name, 'AssertionError');
		t.equal(result.error.values.length, 1);
		t.equal(result.error.values[0].label, 'Error thrown in test:');
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
		t.equal(result.passed, true);
		t.equal(instance.planCount, 16);
		t.equal(instance.assertCount, 16);
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
		t.equal(result.passed, true);
		t.equal(instance.planCount, 16);
		t.equal(instance.assertCount, 16);
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
			})),
		]);
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.planCount, 2);
		t.equal(instance.assertCount, 2);
		t.equal(asyncCalled, true);
	});
});

test('multiple resolving and rejecting promises passed to t.throws/t.notThrows', t => {
	const instance = ava(a => {
		a.plan(6);
		const promises = [];
		for (let i = 0; i < 3; i++) {
			promises.push(
				a.throwsAsync(delay.reject(10, {value: new Error('foo')}), {message: 'foo'}),
				a.notThrowsAsync(delay(10)),
			);
		}

		return Promise.all(promises);
	});
	return instance.run().then(result => {
		t.equal(result.passed, true);
		t.equal(instance.planCount, 6);
		t.equal(instance.assertCount, 6);
	});
});

test('fails if test ends while there are pending assertions', t => ava(a => {
	a.throwsAsync(Promise.reject(new Error()));
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.name, 'Error');
	t.match(result.error.message, /Test finished, but an assertion is still pending/);
}));

test('fails if async test ends while there are pending assertions', t => ava(a => {
	a.throwsAsync(Promise.reject(new Error()));
	return Promise.resolve();
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.name, 'Error');
	t.match(result.error.message, /Test finished, but an assertion is still pending/);
}));

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
			},
		},
		failWithoutAssertions: true,
		fn(a) {
			a.pass();
			t.strictSame(a.context, {foo: 'bar'});
			t.end();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo',
	}).run();
});

test('failing tests should fail', t => ava.failing('foo', a => {
	a.fail();
}).run().then(result => {
	t.equal(result.passed, true);
}));

test('failing tests must not pass', t => ava.failing(a => {
	a.pass();
}).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.message, failingTestHint);
}));

test('failing tests must not return a fulfilled promise', t => ava.failing(a => Promise.resolve().then(() => a.pass())).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.message, failingTestHint);
}));

test('failing tests pass when returning a rejected promise', t => ava.failing(a => {
	a.plan(1);
	return a.notThrowsAsync(delay(10), {value: 'foo'}).then(() => {
		throw new Error('reject');
	});
}).run().then(result => {
	t.equal(result.passed, true);
}));

test('failing tests pass with `t.throwsAsync(nonThrowingPromise)`', t => ava.failing(a => a.throwsAsync(Promise.resolve(10))).run().then(result => {
	t.equal(result.passed, true);
}));

test('failing tests fail with `t.notThrowsAsync(throws)`', t => ava.failing(a => a.notThrowsAsync(Promise.resolve('foo'))).run().then(result => {
	t.equal(result.passed, false);
	t.equal(result.error.message, failingTestHint);
}));

test('log from tests', t => ava(a => {
	a.log('a log message from a test');
	t.ok(true);
	a.log('another log message from a test');
	a.log({b: 1, c: {d: 2}}, 'complex log', 5, 5.1);
	a.log();
	(a.log)('bound');
}).run().then(result => {
	t.same(
		result.logs,
		[
			'a log message from a test',
			'another log message from a test',
			'{\n  b: 1,\n  c: {\n    d: 2,\n  },\n} complex log 5 5.1',
			'bound',
		],
	);
}));

test('assertions are bound', t =>
	// This does not test .fail() and .snapshot(). It'll suffice.
	ava(a => {
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
		t.ok(result.passed);
	}),
);

// Snapshots reused from test/assert.js
test('snapshot assertion can be skipped', t => {
	const projectDir = fileURLToPath(new URL('fixture', import.meta.url));
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'assert.cjs'),
		projectDir,
		fixedLocation: null,
		recordNewSnapshots: true,
		updating: false,
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
		},
	}).run().then(result => {
		t.ok(result.passed);
	});
});

// Snapshots reused from test/assert.js
test('snapshot assertions call options.skipSnapshot when skipped', async t => {
	const projectDir = fileURLToPath(new URL('fixture', import.meta.url));
	const manager = snapshotManager.load({
		file: path.join(projectDir, 'assert.cjs'),
		projectDir,
		fixedLocation: null,
		updating: false,
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
		},
	});

	await test.run();

	t.ok(skipSnapshot.calledTwice);
	for (const [index, call] of skipSnapshot.getCalls().entries()) {
		t.match(call.firstArg, {belongsTo: 'passes', index});
	}
});

test('snapshot assertion can be skipped when updating snapshots', t => new Test({
	updateSnapshots: true,
	metadata: {},
	title: 'passes',
	fn(t) {
		t.snapshot.skip({not: {a: 'match'}});
	},
}).run().then(result => {
	t.ok(result.passed);
}));

test('implementation runs with null scope', t => ava(function (a) {
	a.pass();
	t.equal(this, null);
}).run());

test('timeout with promise', t => ava(a => {
	a.timeout(10);
	return delay(200);
}).run().then(result => {
	t.equal(result.passed, false);
	t.match(result.error.message, /timeout/);
}));

test('timeout is refreshed on assert', {skip: ciInfo.isCI}, t => ava(async a => {
	a.timeout(100);
	a.plan(3);
	await Promise.all([
		delay(50).then(() => a.pass()),
		delay(100).then(() => a.pass()),
		delay(150).then(() => a.pass()),
		delay(200),
	]);
}).run().then(result => {
	t.equal(result.passed, true);
}));

test('teardown passing test', t => {
	const teardown = sinon.spy();
	return ava(a => {
		a.teardown(teardown);
		a.pass();
	}).run().then(result => {
		t.equal(result.passed, true);
		t.ok(teardown.calledOnce);
	});
});

test('teardown failing test', t => {
	const teardown = sinon.spy();
	return ava(a => {
		a.teardown(teardown);
		a.fail();
	}).run().then(result => {
		t.equal(result.passed, false);
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
		t.equal(result.passed, true);
		t.ok(tornDown);
	});
});

test('teardowns run in reverse order', t => {
	let resolveA;
	const teardownA = sinon.stub().returns(new Promise(resolve => {
		resolveA = resolve;
	}));
	const teardownB = sinon.stub().resolves(delay(200));

	return ava(a => {
		a.teardown(teardownA);
		a.teardown(() => teardownB().then(resolveA));
		a.pass();
	}).run().then(result => {
		t.equal(result.passed, true);
		t.ok(teardownB.calledBefore(teardownA));
	});
});

test('teardown without function callback fails', t => ava(a => a.throwsAsync(async () => {
	a.teardown(false);
}, {message: 'Expected a function'})).run().then(result => {
	t.equal(result.passed, true);
}));

test('teardown errors fail the test', t => {
	const teardown = sinon.stub().throws('TeardownError');
	return ava(a => {
		a.teardown(teardown);
		a.pass();
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.name, 'TeardownError');
		t.ok(teardown.calledOnce);
	});
});

test('teardown errors are hidden behind assertion errors', t => {
	const teardown = sinon.stub().throws('TeardownError');
	return ava(a => {
		a.teardown(teardown);
		a.fail();
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.name, 'AssertionError');
		t.ok(teardown.calledOnce);
	});
});

test('teardown errors do not stop next teardown from running', t => {
	const teardownA = sinon.spy();
	const teardownB = sinon.stub().throws('TeardownError');
	return ava(a => {
		a.teardown(teardownA);
		a.teardown(teardownB);
		a.pass();
	}).run().then(result => {
		t.equal(result.passed, false);
		t.equal(result.error.name, 'TeardownError');
		t.ok(teardownA.calledOnce);
		t.ok(teardownB.calledOnce);
		t.ok(teardownB.calledBefore(teardownA));
	});
});

test('teardowns cannot be registered by teardowns', async t => {
	const result = await ava(a => {
		a.teardown(() => {
			a.teardown(() => {});
		});
		a.pass();
	}).run();
	t.equal(result.passed, false);
	t.match(result.error.message, /cannot be used during teardown/);
});

test('.log() is bound', t => ava(a => {
	const {log} = a;
	for (const value of [1, 2, 3]) {
		log('value: ' + value);
	}

	for (const value of ['value foo', 'value bar']) {
		log(value);
	}
}).run().then(result => {
	t.same(result.logs, [
		'value: 1',
		'value: 2',
		'value: 3',
		'value foo',
		'value bar',
	]);
}));

test('.plan() is bound', t => ava(a => {
	const {plan} = a;
	plan(3);

	a.pass();
	a.is(2, 2);
	a.truthy('string');
}).run().then(result => {
	t.ok(result.passed);
}));

test('.timeout() is bound', t => ava(a => {
	const {timeout} = a;
	timeout(10);
	a.pass();
}).run().then(result => {
	t.ok(result.passed);
}));

test('.teardown() is bound', t => {
	const teardownCallback = sinon.spy();
	return ava(a => {
		const {teardown} = a;
		teardown(teardownCallback);
		a.pass();
	}).run().then(result => {
		t.ok(result.passed);
		t.ok(teardownCallback.calledOnce);
	});
});

test('t.passed value is true when teardown callback is executed for passing test', t => {
	new Test({
		fn(a) {
			a.teardown(() => {
				t.equal(a.passed, true);
				t.end();
			});
			a.pass();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo',
	}).run();
});

test('t.passed value is false when teardown callback is executed for failing test', t => {
	new Test({
		fn(a) {
			a.teardown(() => {
				t.equal(a.passed, false);
				t.end();
			});
			a.fail();
		},
		metadata: {type: 'test'},
		onResult() {},
		title: 'foo',
	}).run();
});
