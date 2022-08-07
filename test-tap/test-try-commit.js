import delay from 'delay';
import {test} from 'tap';

import ContextRef from '../lib/context-ref.js';
import {set as setOptions} from '../lib/worker/options.cjs';

import {newAva} from './helper/ava-test.js';

setOptions({chalkOptions: {level: 0}});

test('try-commit works', async t => {
	const ava = newAva();
	const instance = ava(async a => {
		const result = await a.try(b => b.pass());
		t.ok(result.passed);
		result.commit();
	});

	const result = await instance.run();

	t.ok(result.passed);
	t.equal(instance.assertCount, 1);
});

test('try-commit is bound', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const {try: tryFn} = a;
		const result = await tryFn(b => b.pass());
		await result.commit();
	}).run();

	t.ok(result.passed);
});

test('try-commit discards failed attempt', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.fail());
		await result.discard();
		await a.pass();
	}).run();

	t.ok(result.passed);
});

test('try-commit can discard produced result', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.pass());
		result.discard();
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /without running any assertions/);
	t.equal(result.error.name, 'Error');
});

test('try-commit fails when not all assertions were committed/discarded', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		a.pass();
		await a.try(b => b.pass());
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /not all attempts were committed/);
	t.equal(result.error.name, 'Error');
});

test('try-commit works with values', async t => {
	const testValue1 = 123;
	const testValue2 = 123;

	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try((b, value1, value2) => {
			b.is(value1, value2);
		}, testValue1, testValue2);
		t.ok(result.passed);
		result.commit();
	}).run();

	t.ok(result.passed);
});

test('try-commit is properly counted', async t => {
	const ava = newAva();
	const instance = ava(async a => {
		const result = await a.try(b => {
			b.is(1, 1);
			b.is(2, 2);
			b.pass();
		});

		t.ok(result.passed);
		t.equal(instance.pendingAttemptCount, 1);
		result.commit();
		t.equal(instance.pendingAttemptCount, 0);
	});

	const result = await instance.run();

	t.ok(result.passed);
	t.equal(instance.assertCount, 1);
});

test('try-commit is properly counted multiple', async t => {
	const ava = newAva();
	const instance = ava(async a => {
		const [result1, result2, result3] = await Promise.all([
			a.try(b => b.pass()),
			a.try(b => b.pass()),
			a.try(b => b.pass()),
		]);

		t.equal(instance.pendingAttemptCount, 3);
		result1.commit();
		result2.discard();
		result3.commit();
		t.equal(instance.pendingAttemptCount, 0);
	});

	const result = await instance.run();

	t.ok(result.passed);
	t.equal(instance.assertCount, 2);
});

test('try-commit goes as many levels', async t => {
	t.plan(5);
	const ava = newAva();
	const instance = ava(async a => {
		t.ok(a.try);
		const result = await a.try(async b => {
			t.ok(b.try);
			const result = await b.try(c => {
				t.ok(c.try);
				c.pass();
			});
			result.commit();
		});
		result.commit();
	});

	const result = await instance.run();

	t.ok(result.passed);
	t.equal(instance.assertCount, 1);
});

test('try-commit fails when not committed', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.pass());
		t.ok(result.passed);
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /not all attempts were committed/);
	t.equal(result.error.name, 'Error');
});

test('try-commit fails when no assertions inside try', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(() => {});
		t.notOk(result.passed);
		t.ok(result.errors);
		t.equal(result.errors.length, 1);
		const error = result.errors[0];
		t.match(error.message, /Test finished without running any assertions/);
		t.equal(error.name, 'Error');
		result.commit();
	}).run();

	t.notOk(result.passed);
});

test('try-commit fails when no assertions inside multiple try', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const [result1, result2] = await Promise.all([
			a.try(b => b.pass()),
			a.try(() => {}),
		]);

		result1.commit();
		t.ok(result1.passed);

		t.notOk(result2.passed);
		t.ok(result2.errors);
		t.equal(result2.errors.length, 1);
		const error = result2.errors[0];
		t.match(error.message, /Test finished without running any assertions/);
		t.equal(error.name, 'Error');
		result2.commit();
	}).run();

	t.notOk(result.passed);
});

test('test fails when try-commit committed to failed state', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.fail());
		t.notOk(result.passed);
		result.commit();
	}).run();

	t.notOk(result.passed);
});

test('try-commit has proper titles, when going in depth and width', async t => {
	t.plan(6);
	const ava = newAva();
	await ava(async a => {
		t.equal(a.title, 'test');

		await Promise.all([
			a.try(async b => {
				t.equal(b.title, 'test ─ attempt 1');

				await Promise.all([
					b.try(c => t.equal(c.title, 'test ─ attempt 1 ─ attempt 1')),
					b.try(c => t.equal(c.title, 'test ─ attempt 1 ─ attempt 2')),
				]);
			}),
			a.try(b => t.equal(b.title, 'test ─ attempt 2')),
			a.try(b => t.equal(b.title, 'test ─ attempt 3')),
		]);
	}).run();
});

test('try-commit does not fail when calling commit twice', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.pass());
		result.commit();
		result.commit();
	}).run();

	t.ok(result.passed);
	t.notOk(result.error);
});

test('try-commit does not fail when calling discard twice', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => b.pass());
		result.discard();
		result.discard();
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Test finished without running any assertions/);
	t.equal(result.error.name, 'Error');
});

test('try-commit allows planning inside the try', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
			b.pass();
		});
		t.ok(result.passed);
		result.commit();
	}).run();

	t.ok(result.passed);
});

test('try-commit fails when plan is not reached inside the try', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
		});
		t.notOk(result.passed);
		result.commit();
	}).run();

	t.notOk(result.passed);
});

test('plan within try-commit is not affected by assertions outside', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		a.is(1, 1);
		a.is(2, 2);

		const attempt = a.try(b => {
			b.plan(3);
		});

		const result = await attempt;
		t.notOk(result.passed);
		result.commit();
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Planned for 3 assertions, but got 0/);
});

test('assertions within try-commit do not affect plan in the parent test', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		a.plan(2);

		const result = await a.try(b => {
			b.plan(3);
			b.pass();
			b.pass();
			b.pass();
		});

		t.ok(result.passed);
		result.commit();
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Planned for 2 assertions, but got 1/);
});

test('test expected to fail will pass with failing try-commit within the test', async t => {
	const ava = newAva();
	const result = await ava.failing(async a => {
		const result = await a.try(b => b.fail());
		t.notOk(result.passed);
		t.ok(result.errors);
		t.equal(result.errors.length, 1);
		const error = result.errors[0];
		t.match(error.message, /Test failed via `t\.fail\(\)`/);
		t.equal(error.name, 'AssertionError');
		result.commit();
	}).run();

	t.ok(result.passed);
});

test('try-commit accepts macros', async t => {
	const macro = b => {
		t.equal(b.title, 'test ─ Title');
		b.pass();
	};

	macro.title = (providedTitle = '') => `${providedTitle} Title`.trim();

	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(macro);
		t.ok(result.passed);
		result.commit();
	}).run();

	t.ok(result.passed);
});

test('try-commit abides timeout', async t => {
	const ava = newAva();
	const result1 = await ava(async a => {
		a.timeout(10);
		const result = await a.try(async b => {
			b.pass();
			await delay(200);
		});
		await result.commit();
	}).run();

	t.equal(result1.passed, false);
	t.match(result1.error.message, /timeout/);
});

test('try-commit fails when it exceeds its own timeout', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		a.timeout(200);
		const result = await a.try(async b => {
			b.timeout(50);
			b.pass();
			await delay(100);
		});

		t.notOk(result.passed);
		t.ok(result.errors);
		t.equal(result.errors.length, 1);
		const error = result.errors[0];
		t.match(error.message, /Test timeout exceeded/);
		t.equal(error.name, 'Error');

		result.discard();
		a.pass();
	}).run();

	t.ok(result.passed);
});

test('try-commit refreshes the timeout on commit/discard', async t => {
	const ava = newAva();
	const result1 = await ava(async a => {
		// Note: Allow for long enough timeouts that the promise tasks execute in time.
		a.timeout(2e3);
		a.plan(3);
		await Promise.all([
			delay(1e3).then(() => a.try(b => b.pass())).then(result => result.commit()),
			delay(2e3).then(() => a.try(b => b.pass())).then(result => result.commit()),
			delay(3e3).then(() => a.try(b => b.pass())).then(result => result.commit()),
			delay(4e3),
		]);
	}).run();

	t.equal(result1.passed, true);
});

test('assertions within try-commit do not refresh the timeout', async t => {
	const ava = newAva();
	const result = await ava(async a => {
		a.timeout(15);
		a.pass();

		// Attempt by itself will refresh timeout, so it has to finish after
		// timeout of the test in order to make sure that it does not refresh the
		// timeout. However, if assert within attempt is called before test timeout
		// expires and will refresh the timeout (which is faulty behavior), then
		// the entire test will not fail by timeout.
		const result = await a.try(async b => {
			await delay(10);
			b.is(1, 1);
			await delay(10);
		});
		result.commit();
	}).run();

	t.notOk(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Test timeout exceeded/);
	t.equal(result.error.name, 'Error');
});

test('try-commit inherits the test context', async t => {
	const context = new ContextRef();
	const data = {foo: 'bar'};
	context.set(data);
	const ava = newAva();
	const result = await ava(async a => {
		const result = await a.try(b => {
			b.pass();
			t.strictSame(b.context, data);
		});
		await result.commit();
	}, context).run();

	t.equal(result.passed, true);
});

test('assigning context in try-commit does not affect parent', async t => {
	const context = new ContextRef();
	const data = {foo: 'bar'};
	context.set(data);
	const ava = newAva();
	const result = await ava(async a => {
		t.strictSame(a.context, data);
		const result = await a.try(b => {
			b.pass();
			b.context = {bar: 'foo'};
		});
		result.commit();
		t.strictSame(a.context, data);
	}, context).run();

	t.equal(result.passed, true);
});

test('do not run assertions outside of an active attempt', async t => {
	const ava = newAva();
	const passing = await ava(async a => {
		await a.try(() => {});
		a.pass();
	}, undefined, 'passing').run();

	t.notOk(passing.passed);
	t.match(passing.error.message, /Assertion passed, but an attempt is pending. Use the attempt’s assertions instead/);

	const pending = await ava(async a => {
		await a.try(() => {});
		await a.throwsAsync(Promise.reject(new Error('')));
	}, undefined, 'pending').run();
	t.notOk(pending.passed);
	t.match(pending.error.message, /Assertion started, but an attempt is pending. Use the attempt’s assertions instead/);

	const failing = await ava(async a => {
		await a.try(() => {});
		a.fail();
	}, undefined, 'failing').run();

	t.notOk(failing.passed);
	t.match(failing.error.message, /Assertion failed, but an attempt is pending. Use the attempt’s assertions instead/);
});
