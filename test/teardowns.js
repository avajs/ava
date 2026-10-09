import {setImmediate as immediate} from 'node:timers/promises';

import test from '@ava/test';
import sinon from 'sinon';

import {set as setOptions} from '../lib/worker/options.js';
import {ava} from '../test-tap/helper/ava-test.js';

setOptions({});

test('teardown runs once when timeout finishes before promise settles', async t => {
	const testCompletion = Promise.withResolvers();
	const teardown = sinon.spy();
	const instance = ava(async a => {
		a.teardown(teardown);
		a.timeout(20);
		a.pass();
		await testCompletion.promise;
	});
	const result = await instance.run();
	t.is(result.passed, false);
	t.regex(result.error.message, /timeout/);
	// Allow the original test promise to settle and attempt a second finish().
	testCompletion.resolve();
	await immediate();
	t.is(teardown.callCount, 1);
});

test('teardown runs once when inactivity finishes before promise settles', async t => {
	const testCompletion = Promise.withResolvers();
	const teardown = sinon.spy();
	const instance = ava(async a => {
		a.teardown(teardown);
		a.pass();
		await testCompletion.promise;
	});
	const runPromise = instance.run();
	// Force the inactivity path used when a returned promise never settles promptly.
	t.is(typeof instance.finishDueToInactivity, 'function');
	instance.finishDueToInactivity();
	const result = await runPromise;
	t.is(result.passed, false);
	t.regex(result.error.message, /never resolved/);
	testCompletion.resolve();
	await immediate();
	t.is(teardown.callCount, 1);
});

test('finishing again waits for an in-progress teardown', async t => {
	const testCompletion = Promise.withResolvers();
	const teardownCompletion = Promise.withResolvers();
	const teardownStarted = Promise.withResolvers();
	const teardown = sinon.spy(async () => {
		teardownStarted.resolve();
		await teardownCompletion.promise;
	});
	const instance = ava(async a => {
		a.teardown(teardown);
		a.pass();
		await testCompletion.promise;
	});
	const runPromise = instance.run();
	instance.finishDueToInactivity();
	await teardownStarted.promise;

	const finishPromise = instance.finishOnce();
	t.is(instance.finishOnce(), finishPromise);
	const finished = sinon.spy();
	finishPromise.then(finished);
	testCompletion.resolve();
	await immediate();
	t.false(finished.called);
	t.is(teardown.callCount, 1);

	teardownCompletion.resolve();
	const result = await runPromise;
	t.is(await finishPromise, result);
	t.false(result.passed);
	t.regex(result.error.message, /never resolved/);
	t.is(teardown.callCount, 1);
});
