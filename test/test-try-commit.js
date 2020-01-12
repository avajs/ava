'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({chalkOptions: {level: 0}});

const {test} = require('tap');
const delay = require('delay');
const ContextRef = require('../lib/context-ref');
const {withExperiments} = require('./helper/ava-test');

const ava = withExperiments({tryAssertion: true});

test('try-commit works', async t => {
	const instance = ava(async a => {
		const res = await a.try(b => b.pass());
		t.true(res.passed);
		res.commit();
	});

	const result = await instance.run();

	t.true(result.passed);
	t.is(instance.assertCount, 1);
});

test('try-commit is bound', async t => {
	const result = await ava(async a => {
		const {try: tryFn} = a;
		const res = await tryFn(b => b.pass());
		await res.commit();
	}).run();

	t.true(result.passed);
});

test('try-commit discards failed attempt', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.fail());
		await res.discard();
		await a.pass();
	}).run();

	t.true(result.passed);
});

test('try-commit can discard produced result', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.pass());
		res.discard();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /without running any assertions/);
	t.is(result.error.name, 'Error');
});

test('try-commit fails when not all assertions were committed/discarded', async t => {
	const result = await ava(async a => {
		a.pass();
		await a.try(b => b.pass());
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /not all attempts were committed/);
	t.is(result.error.name, 'Error');
});

test('try-commit works with values', async t => {
	const testValue1 = 123;
	const testValue2 = 123;

	const result = await ava(async a => {
		const res = await a.try((b, val1, val2) => {
			b.is(val1, val2);
		}, testValue1, testValue2);
		t.true(res.passed);
		res.commit();
	}).run();

	t.true(result.passed);
});

test('try-commit is properly counted', async t => {
	const instance = ava(async a => {
		const res = await a.try(b => {
			b.is(1, 1);
			b.is(2, 2);
			b.pass();
		});

		t.true(res.passed);
		t.is(instance.pendingAttemptCount, 1);
		res.commit();
		t.is(instance.pendingAttemptCount, 0);
	});

	const result = await instance.run();

	t.true(result.passed);
	t.is(instance.assertCount, 1);
});

test('try-commit is properly counted multiple', async t => {
	const instance = ava(async a => {
		const [res1, res2, res3] = await Promise.all([
			a.try(b => b.pass()),
			a.try(b => b.pass()),
			a.try(b => b.pass())
		]);

		t.is(instance.pendingAttemptCount, 3);
		res1.commit();
		res2.discard();
		res3.commit();
		t.is(instance.pendingAttemptCount, 0);
	});

	const result = await instance.run();

	t.true(result.passed);
	t.is(instance.assertCount, 2);
});

test('try-commit goes as many levels', async t => {
	t.plan(5);
	const instance = ava(async a => {
		t.ok(a.try);
		const res1 = await a.try(async b => {
			t.ok(b.try);
			const res = await b.try(c => {
				t.ok(c.try);
				c.pass();
			});
			res.commit();
		});
		res1.commit();
	});

	const result = await instance.run();

	t.true(result.passed);
	t.is(instance.assertCount, 1);
});

test('try-commit fails when not committed', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.pass());
		t.true(res.passed);
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /not all attempts were committed/);
	t.is(result.error.name, 'Error');
});

test('try-commit fails when no assertions inside try', async t => {
	const result = await ava(async a => {
		const res = await a.try(() => {});
		t.false(res.passed);
		t.ok(res.errors);
		t.is(res.errors.length, 1);
		const error = res.errors[0];
		t.match(error.message, /Test finished without running any assertions/);
		t.is(error.name, 'Error');
		res.commit();
	}).run();

	t.false(result.passed);
});

test('try-commit fails when no assertions inside multiple try', async t => {
	const result = await ava(async a => {
		const [res1, res2] = await Promise.all([
			a.try(b => b.pass()),
			a.try(() => {})
		]);

		res1.commit();
		t.true(res1.passed);

		t.false(res2.passed);
		t.ok(res2.errors);
		t.is(res2.errors.length, 1);
		const error = res2.errors[0];
		t.match(error.message, /Test finished without running any assertions/);
		t.is(error.name, 'Error');
		res2.commit();
	}).run();

	t.false(result.passed);
});

test('test fails when try-commit committed to failed state', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.fail());
		t.false(res.passed);
		res.commit();
	}).run();

	t.false(result.passed);
});

test('try-commit has proper titles, when going in depth and width', async t => {
	t.plan(6);
	await ava(async a => {
		t.is(a.title, 'test');

		await Promise.all([
			a.try(async b => {
				t.is(b.title, 'test (attempt 1)');

				await Promise.all([
					b.try(c => t.is(c.title, 'test (attempt 1) (attempt 1)')),
					b.try(c => t.is(c.title, 'test (attempt 1) (attempt 2)'))
				]);
			}),
			a.try(b => t.is(b.title, 'test (attempt 2)')),
			a.try(b => t.is(b.title, 'test (attempt 3)'))
		]);
	}).run();
});

test('try-commit does not fail when calling commit twice', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.pass());
		res.commit();
		res.commit();
	}).run();

	t.true(result.passed);
	t.false(result.error);
});

test('try-commit does not fail when calling discard twice', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => b.pass());
		res.discard();
		res.discard();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Test finished without running any assertions/);
	t.is(result.error.name, 'Error');
});

test('try-commit allows planning inside the try', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
			b.pass();
		});
		t.true(res.passed);
		res.commit();
	}).run();

	t.true(result.passed);
});

test('try-commit fails when plan is not reached inside the try', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => {
			b.plan(3);

			b.pass();
			b.pass();
		});
		t.false(res.passed);
		res.commit();
	}).run();

	t.false(result.passed);
});

test('plan within try-commit is not affected by assertions outside', async t => {
	const result = await ava(async a => {
		a.is(1, 1);
		a.is(2, 2);

		const attempt = a.try(b => {
			b.plan(3);
		});

		const res = await attempt;
		t.false(res.passed);
		res.commit();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Planned for 3 assertions, but got 0/);
});

test('assertions within try-commit do not affect plan in the parent test', async t => {
	const result = await ava(async a => {
		a.plan(2);

		const res = await a.try(b => {
			b.plan(3);
			b.pass();
			b.pass();
			b.pass();
		});

		t.true(res.passed);
		res.commit();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Planned for 2 assertions, but got 1/);
});

test('test expected to fail will pass with failing try-commit within the test', async t => {
	const result = await ava.failing(async a => {
		const res = await a.try(b => b.fail());
		t.false(res.passed);
		t.ok(res.errors);
		t.is(res.errors.length, 1);
		const error = res.errors[0];
		t.match(error.message, /Test failed via `t\.fail\(\)`/);
		t.is(error.name, 'AssertionError');
		res.commit();
	}).run();

	t.true(result.passed);
});

test('try-commit works with callback test', async t => {
	const result = await ava.cb(a => {
		a
			.try(b => b.pass())
			.then(res => {
				res.commit();
				a.end();
			});
	}).run();

	t.true(result.passed);
});

test('try-commit works with failing callback test', async t => {
	const result = await ava.cb.failing(a => {
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
	}).run();

	t.true(result.passed);
});

test('try-commit does not allow to use .end() in attempt when parent is callback test', async t => {
	const result = await ava.cb(a => {
		a
			.try(b => {
				b.pass();
				b.end();
			})
			.then(res => {
				res.commit();
				a.end();
			});
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Error thrown in test/);
	t.is(result.error.name, 'AssertionError');
	t.match(result.error.values[0].formatted, /t\.end.*not supported/);
});

test('try-commit does not allow to use .end() in attempt when parent is regular test', async t => {
	const result = await ava(async a => {
		const res = await a.try(b => {
			b.pass();
			b.end();
		});

		res.commit();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Error thrown in test/);
	t.is(result.error.name, 'AssertionError');
	t.match(result.error.values[0].formatted, /t\.end.*not supported/);
});

test('try-commit accepts macros', async t => {
	const macro = b => {
		t.is(b.title, ' Title');
		b.pass();
	};

	macro.title = providedTitle => `${providedTitle ? providedTitle : ''} Title`;

	const result = await ava(async a => {
		const res = await a.try(macro);
		t.true(res.passed);
		res.commit();
	}).run();

	t.true(result.passed);
});

test('try-commit accepts multiple macros', async t => {
	const macros = [b => b.pass(), b => b.fail()];
	const result = await ava(async a => {
		const [res1, res2] = await a.try(macros);
		t.true(res1.passed);
		res1.commit();
		t.false(res2.passed);
		res2.discard();
	}).run();

	t.true(result.passed);
});

test('try-commit returns results in the same shape as when implementations are passed', async t => {
	const result = await ava(async a => {
		const [res1, res2, res3] = await Promise.all([
			a.try(b => b.pass()),
			a.try([b => b.pass()]),
			a.try([b => b.pass(), b => b.fail()])
		]);

		t.match(res1, {passed: true});
		res1.commit();

		t.is(res2.length, 1);
		t.match(res2, [{passed: true}]);
		res2[0].commit();

		t.is(res3.length, 2);
		t.match(res3, [{passed: true}, {passed: false}]);
		res3[0].commit();
		res3[1].discard();
	}).run();

	t.true(result.passed);
});

test('try-commit abides timeout', async t => {
	const result1 = await ava(async a => {
		a.timeout(10);
		const result = await a.try(async b => {
			b.pass();
			await delay(200);
		});
		await result.commit();
	}).run();

	t.is(result1.passed, false);
	t.match(result1.error.message, /timeout/);
});

test('try-commit fails when it exceeds its own timeout', async t => {
	const result = await ava(async a => {
		a.timeout(200);
		const result = await a.try(async b => {
			b.timeout(50);
			b.pass();
			await delay(100);
		});

		t.false(result.passed);
		t.ok(result.errors);
		t.is(result.errors.length, 1);
		const error = result.errors[0];
		t.match(error.message, /Test timeout exceeded/);
		t.is(error.name, 'Error');

		result.discard();
		a.pass();
	}).run();

	t.true(result.passed);
});

test('try-commit refreshes the timeout on commit/discard', async t => {
	const result1 = await ava.cb(a => {
		a.timeout(100);
		a.plan(3);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 50);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 100);
		setTimeout(() => a.try(b => b.pass()).then(result => result.commit()), 150);
		setTimeout(() => a.end(), 200);
	}).run();

	t.is(result1.passed, true);
});

test('assertions within try-commit do not refresh the timeout', async t => {
	const result = await ava(async a => {
		a.timeout(15);
		a.pass();

		// Attempt by itself will refresh timeout, so it has to finish after
		// timeout of the test in order to make sure that it does not refresh the
		// timeout. However, if assert within attempt is called before test timeout
		// expires and will refresh the timeout (which is faulty behavior), then
		// the entire test will not fail by timeout.
		const res = await a.try(async b => {
			await delay(10);
			b.is(1, 1);
			await delay(10);
		});
		res.commit();
	}).run();

	t.false(result.passed);
	t.ok(result.error);
	t.match(result.error.message, /Test timeout exceeded/);
	t.is(result.error.name, 'Error');
});

test('try-commit inherits the test context', async t => {
	const context = new ContextRef();
	const data = {foo: 'bar'};
	context.set(data);
	const result = await ava(async a => {
		const res = await a.try(b => {
			b.pass();
			t.strictDeepEqual(b.context, data);
		});
		await res.commit();
	}, context).run();

	t.is(result.passed, true);
});

test('assigning context in try-commit does not affect parent', async t => {
	const context = new ContextRef();
	const data = {foo: 'bar'};
	context.set(data);
	const result = await ava(async a => {
		t.strictDeepEqual(a.context, data);
		const res = await a.try(b => {
			b.pass();
			b.context = {bar: 'foo'};
		});
		res.commit();
		t.strictDeepEqual(a.context, data);
	}, context).run();

	t.is(result.passed, true);
});

test('do not run assertions outside of an active attempt', async t => {
	const passing = await ava(async a => {
		await a.try(() => {});
		a.pass();
	}).run();

	t.false(passing.passed);
	t.match(passing.error.message, /Assertion passed, but an attempt is pending. Use the attempt’s assertions instead/);

	const pending = await ava(async a => {
		await a.try(() => {});
		await a.throwsAsync(Promise.reject(new Error('')));
	}).run();

	t.false(pending.passed);
	t.match(pending.error.message, /Assertion started, but an attempt is pending. Use the attempt’s assertions instead/);

	const failing = await ava(async a => {
		await a.try(() => {});
		a.fail();
	}).run();

	t.false(failing.passed);
	t.match(failing.error.message, /Assertion failed, but an attempt is pending. Use the attempt’s assertions instead/);
});
