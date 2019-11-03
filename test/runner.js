'use strict';
require('../lib/chalk').set();
require('../lib/worker/options').set({});

const {test} = require('tap');
const Runner = require('../lib/runner');

const noop = () => {};

const promiseEnd = (runner, next) => {
	return new Promise(resolve => {
		resolve(runner.once('finish'));
		next(runner);
	}).then(() => runner);
};

test('nested tests and hooks aren\'t allowed', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		runner.chain('test', a => {
			t.throws(() => {
				runner.chain(noop);
			}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});
			a.pass();
		});
	});
});

test('tests must be declared synchronously', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		runner.chain('test', a => {
			a.pass();
			return Promise.resolve();
		});
	}).then(runner => {
		t.throws(() => {
			runner.chain(noop);
		}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});
	});
});

test('runner emits "stateChange" events', t => {
	const runner = new Runner();

	runner.on('stateChange', evt => {
		if (evt.type === 'declared-test') {
			t.deepEqual(evt, {
				type: 'declared-test',
				title: 'foo',
				knownFailing: false,
				todo: false
			});
			t.end();
		}
	});

	runner.chain('foo', a => {
		a.pass();
	});
});

test('run serial tests before concurrent ones', t => {
	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain('test', a => {
			arr.push('c');
			a.end();
		});

		runner.chain.serial('serial', a => {
			arr.push('a');
			a.end();
		});

		runner.chain.serial('serial 2', a => {
			arr.push('b');
			a.end();
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b', 'c']);
	});
});

test('anything can be skipped', t => {
	const arr = [];
	function pusher(title) {
		return a => {
			arr.push(title);
			a.pass();
		};
	}

	return promiseEnd(new Runner(), runner => {
		runner.chain.after(pusher('after'));
		runner.chain.after.skip(pusher('after.skip'));

		runner.chain.afterEach(pusher('afterEach'));
		runner.chain.afterEach.skip(pusher('afterEach.skip'));

		runner.chain.before(pusher('before'));
		runner.chain.before.skip(pusher('before.skip'));

		runner.chain.beforeEach(pusher('beforeEach'));
		runner.chain.beforeEach.skip(pusher('beforeEach.skip'));

		runner.chain('concurrent', pusher('concurrent'));
		runner.chain.skip('concurrent.skip', pusher('concurrent.skip'));

		runner.chain.serial('serial', pusher('serial'));
		runner.chain.serial.skip('serial.skip', pusher('serial.skip'));
	}).then(() => {
		// Note that afterEach and beforeEach run twice because there are two actual tests - "serial" and "concurrent"
		t.strictDeepEqual(arr, [
			'before',
			'beforeEach',
			'serial',
			'afterEach',
			'beforeEach',
			'concurrent',
			'afterEach',
			'after'
		]);
	});
});

test('test types and titles', t => {
	t.plan(10);

	const fail = a => a.fail();
	const pass = a => a.pass();

	const check = (setup, expect) => {
		const runner = new Runner();
		runner.on('stateChange', evt => {
			if (evt.type === 'hook-failed' || evt.type === 'test-failed' || evt.type === 'test-passed') {
				const expected = expect.shift();
				t.is(evt.title, expected.title);
			}
		});
		return promiseEnd(runner, () => setup(runner.chain));
	};

	return Promise.all([
		check(chain => {
			chain.before(fail);
			chain('test', pass);
		}, [
			{type: 'before', title: 'before hook'}
		]),
		check(chain => {
			chain('test', pass);
			chain.after(fail);
		}, [
			{type: 'test', title: 'test'},
			{type: 'after', title: 'after hook'}
		]),
		check(chain => {
			chain('test', pass);
			chain.after.always(fail);
		}, [
			{type: 'test', title: 'test'},
			{type: 'after', title: 'after.always hook'}
		]),
		check(chain => {
			chain.beforeEach(fail);
			chain('test', fail);
		}, [
			{type: 'beforeEach', title: 'beforeEach hook for test'}
		]),
		check(chain => {
			chain('test', pass);
			chain.afterEach(fail);
		}, [
			{type: 'test', title: 'test'},
			{type: 'afterEach', title: 'afterEach hook for test'}
		]),
		check(chain => {
			chain('test', pass);
			chain.afterEach.always(fail);
		}, [
			{type: 'test', title: 'test'},
			{type: 'afterEach', title: 'afterEach.always hook for test'}
		])
	]);
});

test('skip test', t => {
	t.plan(3);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'selected-test' && evt.skip) {
				t.pass();
			}

			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('test', a => {
			arr.push('a');
			a.pass();
		});

		runner.chain.skip('skip', () => {
			arr.push('b');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('tests must have a non-empty title)', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		t.throws(() => {
			runner.chain('', t => t.pass());
		}, new TypeError('Tests must have a title'));
	});
});

test('test titles must be unique', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		runner.chain('title', t => t.pass());

		t.throws(() => {
			runner.chain('title', t => t.pass());
		}, new Error('Duplicate test title: title'));
	});
});

test('tests must have an implementation', t => {
	t.plan(1);

	const runner = new Runner();

	t.throws(() => {
		runner.chain('title');
	}, new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.'));
});

test('todo test', t => {
	t.plan(3);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'selected-test' && evt.todo) {
				t.pass();
			}

			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('test', a => {
			arr.push('a');
			a.pass();
		});

		runner.chain.todo('todo');
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('todo tests must not have an implementation', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		t.throws(() => {
			runner.chain.todo('todo', () => {});
		}, new TypeError('`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.'));
	});
});

test('todo tests must have a title', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		t.throws(() => {
			runner.chain.todo();
		}, new TypeError('`todo` tests require a title'));
	});
});

test('todo test titles must be unique', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		runner.chain('title', t => t.pass());

		t.throws(() => {
			runner.chain.todo('title');
		}, new Error('Duplicate test title: title'));
	});
});

test('only test', t => {
	t.plan(2);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'selected-test') {
				t.pass();
			}
		});

		runner.chain('test', a => {
			arr.push('a');
			a.pass();
		});

		runner.chain.only('only', a => {
			arr.push('b');
			a.pass();
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['b']);
	});
});

test('options.runOnlyExclusive means only exclusive tests are run', t => {
	t.plan(1);

	return promiseEnd(new Runner({runOnlyExclusive: true}), runner => {
		runner.chain('test', () => {
			t.fail();
		});

		runner.chain.only('test 2', () => {
			t.pass();
		});
	});
});

test('options.serial forces all tests to be serial', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner({serial: true}), runner => {
		runner.chain.cb('cb', a => {
			setTimeout(() => {
				arr.push(1);
				a.end();
			}, 200);
			a.pass();
		});

		runner.chain.cb('cb 2', a => {
			setTimeout(() => {
				arr.push(2);
				a.end();
			}, 100);
			a.pass();
		});

		runner.chain('test', a => {
			a.pass();
			t.strictDeepEqual(arr, [1, 2]);
		});
	});
});

test('options.failFast does not stop concurrent tests from running', t => {
	const expected = ['first', 'second'];
	t.plan(expected.length);

	promiseEnd(new Runner({failFast: true}), runner => {
		let block;
		let resume;
		runner.chain.beforeEach(() => {
			if (block) {
				return block;
			}

			block = new Promise(resolve => {
				resume = resolve;
			});
		});

		runner.chain('first', a => {
			resume();
			a.fail();
		});

		runner.chain('second', a => {
			a.pass();
		});

		runner.on('stateChange', evt => {
			if (evt.type === 'test-failed' || evt.type === 'test-passed') {
				t.is(evt.title, expected.shift());
			}
		});
	});
});

test('options.failFast && options.serial stops subsequent tests from running ', t => {
	const expected = ['first'];
	t.plan(expected.length);

	promiseEnd(new Runner({failFast: true, serial: true}), runner => {
		let block;
		let resume;
		runner.chain.beforeEach(() => {
			if (block) {
				return block;
			}

			block = new Promise(resolve => {
				resume = resolve;
			});
		});

		runner.chain('first', a => {
			resume();
			a.fail();
		});

		runner.chain('second', a => {
			a.pass();
		});

		runner.on('stateChange', evt => {
			if (evt.type === 'test-failed' || evt.type === 'test-passed') {
				t.is(evt.title, expected.shift());
			}
		});
	});
});

test('options.failFast & failing serial test stops subsequent tests from running ', t => {
	const expected = ['first'];
	t.plan(expected.length);

	promiseEnd(new Runner({failFast: true, serial: true}), runner => {
		let block;
		let resume;
		runner.chain.beforeEach(() => {
			if (block) {
				return block;
			}

			block = new Promise(resolve => {
				resume = resolve;
			});
		});

		runner.chain.serial('first', a => {
			resume();
			a.fail();
		});

		runner.chain.serial('second', a => {
			a.pass();
		});

		runner.chain('third', a => {
			a.pass();
		});

		runner.on('stateChange', evt => {
			if (evt.type === 'test-failed' || evt.type === 'test-passed') {
				t.is(evt.title, expected.shift());
			}
		});
	});
});

test('options.match will not run tests with non-matching titles', t => {
	t.plan(4);

	return promiseEnd(new Runner({match: ['*oo', '!foo']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('mhm. grass tasty. moo', a => {
			t.pass();
			a.pass();
		});

		runner.chain('juggaloo', a => {
			t.pass();
			a.pass();
		});

		runner.chain('foo', a => {
			t.fail();
			a.pass();
		});

		runner.chain('test', a => {
			t.fail();
			a.pass();
		});
	});
});

test('options.match hold no effect on hooks with titles', t => {
	t.plan(2);

	return promiseEnd(new Runner({match: ['!before*']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		let actual;

		runner.chain.before('before hook with title', () => {
			actual = 'foo';
		});

		runner.chain('after', a => {
			t.is(actual, 'foo');
			a.pass();
		});
	});
});

test('options.match overrides .only', t => {
	t.plan(4);

	return promiseEnd(new Runner({match: ['*oo']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('moo', a => {
			t.pass();
			a.pass();
		});

		runner.chain.only('boo', a => {
			t.pass();
			a.pass();
		});
	});
});

test('options.match matches todo tests', t => {
	t.plan(1);

	return promiseEnd(new Runner({match: ['*oo']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'selected-test' && evt.todo) {
				t.pass();
			}
		});

		runner.chain.todo('moo');
		runner.chain.todo('oom');
	});
});

test('macros: Additional args will be spread as additional args on implementation function', t => {
	t.plan(3);

	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain.before((a, ...rest) => {
			t.deepEqual(rest, ['foo', 'bar']);
			a.pass();
		}, 'foo', 'bar');

		runner.chain('test1', (a, ...rest) => {
			t.deepEqual(rest, ['foo', 'bar']);
			a.pass();
		}, 'foo', 'bar');
	});
});

test('macros: Customize test names attaching a `title` function', t => {
	t.plan(6);

	const expectedTitles = [
		'defaultA',
		'suppliedB',
		'defaultC'
	];

	const expectedArgs = [
		['A'],
		['B'],
		['C']
	];

	function macroFn(avaT, ...rest) {
		t.deepEqual(rest, expectedArgs.shift());
		avaT.pass();
	}

	macroFn.title = (title = 'default', firstArg = undefined) => title + firstArg;

	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'declared-test') {
				t.is(evt.title, expectedTitles.shift());
			}
		});

		runner.chain(macroFn, 'A');
		runner.chain('supplied', macroFn, 'B');
		runner.chain(macroFn, 'C');
	});
});

test('macros: test titles must be strings', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		t.throws(() => {
			const macro = t => t.pass();
			macro.title = () => [];
			runner.chain(macro);
		}, new TypeError('Test & hook titles must be strings'));
	});
});

test('macros: hook titles must be strings', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		t.throws(() => {
			const macro = t => t.pass();
			macro.title = () => [];
			runner.chain.before(macro);
		}, new TypeError('Test & hook titles must be strings'));
	});
});

test('match applies to macros', t => {
	t.plan(1);

	function macroFn(avaT) {
		avaT.pass();
	}

	macroFn.title = (title, firstArg) => `${firstArg}bar`;

	return promiseEnd(new Runner({match: ['foobar']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.is(evt.title, 'foobar');
			}
		});

		runner.chain(macroFn, 'foo');
		runner.chain(macroFn, 'bar');
	});
});

test('arrays of macros', t => {
	const expectedArgsA = [
		['A'],
		['B'],
		['C']
	];

	const expectedArgsB = [
		['A'],
		['B'],
		['D']
	];

	function macroFnA(a, ...rest) {
		t.deepEqual(rest, expectedArgsA.shift());
		a.pass();
	}

	macroFnA.title = prefix => `${prefix}.A`;

	function macroFnB(a, ...rest) {
		t.deepEqual(rest, expectedArgsB.shift());
		a.pass();
	}

	macroFnB.title = prefix => `${prefix}.B`;

	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('A', [macroFnA, macroFnB], 'A');
		runner.chain('B', [macroFnA, macroFnB], 'B');
		runner.chain('C', macroFnA, 'C');
		runner.chain('D', macroFnB, 'D');
	}).then(() => {
		t.is(expectedArgsA.length, 0);
		t.is(expectedArgsB.length, 0);
	});
});

test('match applies to arrays of macros', t => {
	t.plan(1);

	// Foo
	function fooMacro(a) {
		t.fail();
		a.pass();
	}

	fooMacro.title = (title, firstArg) => `${firstArg}foo`;

	function barMacro(avaT) {
		avaT.pass();
	}

	barMacro.title = (title, firstArg) => `${firstArg}bar`;

	function bazMacro(a) {
		t.fail();
		a.pass();
	}

	bazMacro.title = (title, firstArg) => `${firstArg}baz`;

	return promiseEnd(new Runner({match: ['foobar']}), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.is(evt.title, 'foobar');
			}
		});

		runner.chain([fooMacro, barMacro, bazMacro], 'foo');
		runner.chain([fooMacro, barMacro, bazMacro], 'bar');
	});
});

test('silently skips other tests when .only is used', t => {
	t.plan(1);
	return promiseEnd(new Runner(), runner => {
		runner.on('stateChange', evt => {
			if (evt.type === 'test-passed') {
				t.pass();
			}
		});

		runner.chain('skip me', a => a.pass());
		runner.chain.serial('skip me too', a => a.pass());
		runner.chain.only('only me', a => a.pass());
	});
});

test('subsequent always hooks are run even if earlier always hooks fail', t => {
	t.plan(3);
	return promiseEnd(new Runner(), runner => {
		runner.chain('test', a => a.pass());
		runner.chain.serial.after.always(a => {
			t.pass();
			a.fail();
		});
		runner.chain.serial.after.always(a => {
			t.pass();
			a.fail();
		});
		runner.chain.after.always(a => {
			t.pass();
			a.fail();
		});
	});
});

test('hooks run concurrently, but can be serialized', t => {
	t.plan(7);

	let activeCount = 0;
	return promiseEnd(new Runner(), runner => {
		runner.chain('test', a => a.pass());

		runner.chain.before(() => {
			t.is(activeCount, 0);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 20)).then(() => {
				activeCount--;
			});
		});

		runner.chain.before(() => {
			t.is(activeCount, 1);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
				activeCount--;
			});
		});

		runner.chain.serial.before(() => {
			t.is(activeCount, 0);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
				activeCount--;
			});
		});

		runner.chain.before(() => {
			t.is(activeCount, 0);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 20)).then(() => {
				activeCount--;
			});
		});

		runner.chain.before(() => {
			t.is(activeCount, 1);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
				activeCount--;
			});
		});

		runner.chain.serial.before(() => {
			t.is(activeCount, 0);
			activeCount++;
			return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
				activeCount--;
			});
		});

		runner.chain.serial.before(() => {
			t.is(activeCount, 0);
		});
	});
});
