'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({color: false});

const {test} = require('tap');
const delay = require('delay');
const Test = require('../lib/test');
const {ava} = require('./helper/ava-test');

const contextAva = fn => new Test({
	contextRef: {
		val: {foo: 'bar'},
		get() {
			return this.val;
		},
		set(newVal) {
			this.val = newVal;
		}
	},
	failWithoutAssertions: true,
	metadata: {type: 'test'},
	title: 'foo',
	registerUniqueTitle: () => true,
	fn
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

test('try-commit is bound', t => {
	return ava(a => {
		const {try: tryFn} = a;
		return tryFn(b => b.pass())
			.then(res => res.commit());
	}).run().then(result => {
		t.true(result.passed);
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

test('try-commit cannot access parent test context', t => {
	return contextAva(a => {
		return a.try(b => {
			b.pass();
			const ctx = b.context;
			t.is(ctx, undefined);
		}).then(res => res.commit());
	}).run().then(result => {
		t.is(result.passed, true);
	});
});

test('try-commit cannot set parent test context', t => {
	return contextAva(a => {
		t.strictDeepEqual(a.context, {foo: 'bar'});
		return a.try(b => {
			b.pass();
			b.context = {bar: 'foo'};
		}).then(res => {
			res.commit();
			t.strictDeepEqual(a.context, {foo: 'bar'});
		});
	}).run().then(result => {
		t.is(result.passed, true);
	});
});
