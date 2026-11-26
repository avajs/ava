import {test} from 'tap';

import Runner from '../lib/runner.js';
import {set as setOptions} from '../lib/worker/options.js';

setOptions({});

const promiseEnd = (runner, next) => new Promise(resolve => {
	resolve(runner.once('finish'));
	next(runner);
}).then(() => runner);

test('before', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.before(() => {
			array.push('a');
		});

		runner.chain('test', a => {
			a.pass();
			array.push('b');
		});
	}).then(() => {
		t.strictSame(array, ['a', 'b']);
	});
});

test('after', t => {
	t.plan(2);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', ({data: evt}) => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain.after(() => {
			array.push('b');
		});

		runner.chain('test', a => {
			a.pass();
			array.push('a');
		});
	}).then(() => {
		t.strictSame(array, ['a', 'b']);
	});
});

test('after not run if test failed', t => {
	t.plan(2);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', ({data: evt}) => {
			if (evt.type === 'test-failed') {
				t.pass();
			}
		});

		runner.chain.after(() => {
			array.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, []);
	});
});

test('after.always run even if test failed', t => {
	t.plan(2);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', ({data: evt}) => {
			if (evt.type === 'test-failed') {
				t.pass();
			}
		});

		runner.chain.after.always(() => {
			array.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('after.always run even if before failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.before(() => {
			throw new Error('something went wrong');
		});

		runner.chain('test', a => a.pass());

		runner.chain.after.always(() => {
			array.push('a');
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('stop if before hooks failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.before(() => {
			array.push('a');
		});

		runner.chain.before(() => {
			throw new Error('something went wrong');
		});

		runner.chain('test', a => {
			a.pass();
			array.push('b');
			a.end();
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('before each with concurrent tests', t => {
	t.plan(1);

	const array = [[], []];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		let i = 0;
		let k = 0;

		runner.chain.beforeEach(() => {
			array[i++].push('a');
		});

		runner.chain.beforeEach(() => {
			array[k++].push('b');
		});

		runner.chain('c', a => {
			a.pass();
			array[0].push('c');
		});

		runner.chain('d', a => {
			a.pass();
			array[1].push('d');
		});
	}).then(() => {
		t.strictSame(array, [['a', 'b', 'c'], ['a', 'b', 'd']]);
	});
});

test('before each with serial tests', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.beforeEach(() => {
			array.push('a');
		});

		runner.chain.beforeEach(() => {
			array.push('b');
		});

		runner.chain.serial('c', a => {
			a.pass();
			array.push('c');
		});

		runner.chain.serial('d', a => {
			a.pass();
			array.push('d');
		});
	}).then(() => {
		t.strictSame(array, ['a', 'b', 'c', 'a', 'b', 'd']);
	});
});

test('fail if beforeEach hook fails', t => {
	t.plan(2);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', ({data: evt}) => {
			if (evt.type === 'hook-failed') {
				t.pass();
			}
		});

		runner.chain.beforeEach(a => {
			array.push('a');
			a.fail();
		});

		runner.chain('test', a => {
			array.push('b');
			a.pass();
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('after each with concurrent tests', t => {
	t.plan(1);

	const array = [[], []];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		let i = 0;
		let k = 0;

		runner.chain.afterEach(() => {
			array[i++].push('a');
		});

		runner.chain.afterEach(() => {
			array[k++].push('b');
		});

		runner.chain('c', a => {
			a.pass();
			array[0].push('c');
		});

		runner.chain('d', a => {
			a.pass();
			array[1].push('d');
		});
	}).then(() => {
		t.strictSame(array, [['c', 'a', 'b'], ['d', 'a', 'b']]);
	});
});

test('after each with serial tests', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach(() => {
			array.push('a');
		});

		runner.chain.afterEach(() => {
			array.push('b');
		});

		runner.chain.serial('c', a => {
			a.pass();
			array.push('c');
		});

		runner.chain.serial('d', a => {
			a.pass();
			array.push('d');
		});
	}).then(() => {
		t.strictSame(array, ['c', 'a', 'b', 'd', 'a', 'b']);
	});
});

test('afterEach not run if concurrent tests failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach(() => {
			array.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, []);
	});
});

test('afterEach not run if serial tests failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach(() => {
			array.push('a');
		});

		runner.chain.serial('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, []);
	});
});

test('afterEach.always run even if concurrent tests failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach.always(() => {
			array.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('afterEach.always run even if serial tests failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach.always(() => {
			array.push('a');
		});

		runner.chain.serial('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictSame(array, ['a']);
	});
});

test('afterEach.always run even if beforeEach failed', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.beforeEach(() => {
			throw new Error('something went wrong');
		});

		runner.chain('test', a => {
			a.pass();
			array.push('a');
		});

		runner.chain.afterEach.always(() => {
			array.push('b');
		});
	}).then(() => {
		t.strictSame(array, ['b']);
	});
});

test('afterEach: property `passed` of execution-context is false when test failed and true when test passed', t => {
	t.plan(1);

	const passed = [];
	let i;
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach(a => {
			passed[i] = a.passed;
		});

		runner.chain('failure', () => {
			i = 0;
			throw new Error('something went wrong');
		});
		runner.chain('pass', a => {
			i = 1;
			a.pass();
		});
	}).then(() => {
		t.strictSame(passed, [undefined, true]);
	});
});

test('afterEach.always: property `passed` of execution-context is false when test failed and true when test passed', t => {
	t.plan(1);

	const passed = [];
	let i;
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach.always(a => {
			passed[i] = a.passed;
		});

		runner.chain('failure', () => {
			i = 0;
			throw new Error('something went wrong');
		});
		runner.chain('pass', a => {
			i = 1;
			a.pass();
		});
	}).then(() => {
		t.strictSame(passed, [false, true]);
	});
});

test('afterEach.always: property `passed` of execution-context is false when before hook failed', t => {
	t.plan(1);

	let passed;
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.before(() => {
			throw new Error('something went wrong');
		});
		runner.chain.afterEach.always(a => {
			passed = a.passed;
		});
		runner.chain('pass', a => {
			a.pass();
		});
	}).then(() => {
		t.notOk(passed);
	});
});

test('afterEach.always: property `passed` of execution-context is true when test passed and afterEach hook failed', t => {
	t.plan(1);

	let passed;
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.afterEach(() => {
			throw new Error('something went wrong');
		});
		runner.chain.afterEach.always(a => {
			passed = a.passed;
		});
		runner.chain('pass', a => {
			a.pass();
		});
	}).then(() => {
		t.ok(passed);
	});
});

test('ensure hooks run only around tests', t => {
	t.plan(1);

	const array = [];
	return promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.beforeEach(() => {
			array.push('beforeEach');
		});

		runner.chain.before(() => {
			array.push('before');
		});

		runner.chain.afterEach(() => {
			array.push('afterEach');
		});

		runner.chain.after(() => {
			array.push('after');
		});

		runner.chain('test', a => {
			a.pass();
			array.push('test');
		});
	}).then(() => {
		t.strictSame(array, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
	});
});

test('shared context', t => promiseEnd(new Runner({file: import.meta.url}), runner => {
	runner.on('stateChange', ({data: evt}) => {
		if (evt.type === 'hook-failed' || evt.type === 'test-failed') {
			t.fail();
		}
	});

	runner.chain.before(a => {
		a.deepEqual(a.context, {});
		a.context.arr = ['a'];
		a.context.prop = 'before';
	});

	runner.chain.after(a => {
		a.deepEqual(a.context.arr, ['a', 'b', 'c', 'd']);
		a.is(a.context.prop, 'before');
	});

	runner.chain.beforeEach(a => {
		a.deepEqual(a.context.arr, ['a']);
		a.context.arr.push('b');
		a.is(a.context.prop, 'before');
		a.context.prop = 'beforeEach';
	});

	runner.chain('test', a => {
		a.pass();
		a.deepEqual(a.context.arr, ['a', 'b']);
		a.context.arr.push('c');
		a.is(a.context.prop, 'beforeEach');
		a.context.prop = 'test';
	});

	runner.chain.afterEach(a => {
		a.deepEqual(a.context.arr, ['a', 'b', 'c']);
		a.context.arr.push('d');
		a.is(a.context.prop, 'test');
		a.context.prop = 'afterEach';
	});
}));

test('shared context of any type', t => promiseEnd(new Runner({file: import.meta.url}), runner => {
	runner.on('stateChange', ({data: evt}) => {
		if (evt.type === 'hook-failed' || evt.type === 'test-failed') {
			t.fail();
		}
	});

	runner.chain.beforeEach(a => {
		a.context = 'foo';
	});

	runner.chain('test', a => {
		a.pass();
		a.is(a.context, 'foo');
	});
}));

test('teardowns cannot be used in postcondition hooks', async t => {
	for (const hook of ['after', 'afterEach']) {
		const failures = [];
		await promiseEnd(new Runner({file: import.meta.url}), runner => { // eslint-disable-line no-await-in-loop
			runner.on('stateChange', ({data: event}) => {
				if (event.type === 'hook-failed') {
					failures.push(event);
				}
			});
			runner.chain[hook](a => a.teardown(() => {}));
			runner.chain('test', a => a.pass());
		});
		t.equal(failures.length, 1);
		t.match(failures[0].err.message, /only allowed in tests and setup functions/);
		t.equal(failures[0].failurePhase, hook === 'after' ? 'post-test-file' : 'post-test');
	}
});

test('setup teardowns preserve resources through postconditions and run in reverse order', async t => {
	const calls = [];
	await promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.before(a => {
			a.teardown(() => {
				calls.push('file teardown 1');
			});
			a.teardown(() => {
				calls.push('file teardown 2');
			});
		});
		runner.chain.beforeEach(a => {
			a.teardown(() => {
				calls.push('setup teardown 1');
			});
			a.teardown({
				async [Symbol.asyncDispose]() {
					await Promise.resolve();
					calls.push('setup teardown 2');
				},
			});
		});
		runner.chain.afterEach(() => {
			calls.push('afterEach');
		});
		runner.chain.afterEach.always(() => {
			calls.push('afterEach.always');
		});
		runner.chain.after(() => {
			calls.push('after');
		});
		runner.chain.after.always(() => {
			calls.push('after.always');
		});
		runner.chain('test', a => {
			calls.push('test');
			a.teardown(() => {
				calls.push('test teardown');
			});
			a.pass();
		});
	});
	t.same(calls, [
		'test',
		'test teardown',
		'afterEach',
		'afterEach.always',
		'setup teardown 2',
		'setup teardown 1',
		'after',
		'after.always',
		'file teardown 2',
		'file teardown 1',
	]);
});

test('setup teardowns run despite failures in every lifecycle phase', async t => {
	for (const phase of ['before', 'beforeEach', 'test', 'afterEach', 'afterEach.always', 'after', 'after.always']) {
		const calls = [];
		const failures = [];
		await promiseEnd(new Runner({file: import.meta.url}), runner => { // eslint-disable-line no-await-in-loop
			runner.on('stateChange', ({data: event}) => {
				if (event.type === 'hook-failed' || event.type === 'test-failed') {
					failures.push(event);
				}
			});
			runner.chain.serial.before(a => a.teardown(() => {
				calls.push('file');
			}));
			runner.chain.serial.beforeEach(a => a.teardown(() => {
				calls.push('test');
			}));
			const fail = a => a.fail(`failure in ${phase}`);
			if (phase !== 'test') {
				const [hook, modifier] = phase.split('.', 2);
				const chain = modifier ? runner.chain.serial[hook][modifier] : runner.chain.serial[hook];
				chain(fail);
			}

			runner.chain('test', phase === 'test' ? fail : a => a.pass());
		});
		t.same(calls, phase === 'before' ? ['file'] : ['test', 'file'], phase);
		t.equal(failures.length, 1, phase);
	}
});

test('setup teardown failures are reported and do not prevent remaining cleanup', async t => {
	const calls = [];
	const failures = [];
	await promiseEnd(new Runner({file: import.meta.url, failFast: true}), runner => {
		runner.on('stateChange', ({data: event}) => {
			if (event.type === 'hook-failed') {
				failures.push(event);
			}
		});
		for (const hook of ['before', 'beforeEach']) {
			runner.chain[hook](hook, a => {
				a.teardown(() => {
					calls.push(hook);
				});
				a.teardown(async () => {
					throw new Error(`${hook} cleanup failed`);
				});
			});
		}

		runner.chain.serial('first', a => a.pass());
		runner.chain.serial('skipped by fail-fast', () => t.fail('must not run'));
	});
	t.same(calls, ['beforeEach', 'before']);
	t.same(failures.map(event => event.title), ['beforeEach teardown for first', 'before teardown']);
	t.ok(failures.every(event => event.failurePhase === undefined));
});

test('partially completed async setup still releases resources', async t => {
	await Promise.all(['before', 'beforeEach'].map(async hook => {
		const calls = [];
		const failures = [];
		await promiseEnd(new Runner({file: import.meta.url}), runner => {
			runner.on('stateChange', ({data: event}) => {
				if (event.type === 'hook-failed') {
					failures.push(event);
				}
			});
			runner.chain.serial[hook]('partial setup', async a => {
				a.teardown({
					[Symbol.dispose]() {
						calls.push('dispose');
					},
				});
				await Promise.resolve();
				throw new Error('setup failed');
			});
			runner.chain.serial[hook](() => t.fail('later setup must not run'));
			runner.chain('test', () => t.fail('test must not run'));
		});
		t.same(calls, ['dispose'], hook);
		t.equal(failures.length, 1, hook);
		t.match(failures[0].title, 'partial setup');
	}));
});

test('setup teardowns cannot register more teardowns', async t => {
	const failures = [];
	await promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', ({data: event}) => {
			if (event.type === 'hook-failed') {
				failures.push(event);
			}
		});
		runner.chain.before(a => {
			const registerMore = () => a.teardown(() => {});
			a.teardown(registerMore);
		});
		runner.chain('test', a => a.pass());
	});
	t.equal(failures.length, 1);
	t.match(failures[0].err.formattedCause, /cannot be used during teardown/);
});

test('beforeEach teardowns are isolated between concurrent tests', async t => {
	const resources = new Set();
	const allStarted = Promise.withResolvers();
	let started = 0;
	await promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.chain.beforeEach(a => {
			const resource = {};
			resources.add(resource);
			a.context.resource = resource;
			a.teardown(() => {
				t.ok(resources.delete(resource));
			});
		});
		runner.chain.afterEach(a => a.true(resources.has(a.context.resource)));
		for (const title of ['one', 'two', 'three']) {
			runner.chain(title, async a => {
				if (++started === 3) {
					allStarted.resolve();
				}

				await allStarted.promise;
				a.true(resources.has(a.context.resource));
			});
		}
	});
	t.equal(started, 3);
	t.equal(resources.size, 0);
});
