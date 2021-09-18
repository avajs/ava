import {test} from 'tap';

import Runner from '../lib/runner.js';
import {set as setOptions} from '../lib/worker/options.cjs';

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
		runner.on('stateChange', evt => {
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
		runner.on('stateChange', evt => {
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
		runner.on('stateChange', evt => {
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
		runner.on('stateChange', evt => {
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
	runner.on('stateChange', evt => {
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
	runner.on('stateChange', evt => {
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

test('teardowns cannot be used in hooks', async t => {
	let hookFailure = null;
	await promiseEnd(new Runner({file: import.meta.url}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'hook-failed') {
				hookFailure = evt;
			}
		});

		runner.chain.beforeEach(a => {
			a.teardown(() => {});
		});

		runner.chain('test', a => a.pass());
	});

	t.ok(hookFailure);
	t.match(hookFailure.err.message, /not allowed in hooks/);
});
