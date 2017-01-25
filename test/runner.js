'use strict';
const test = require('tap').test;
const Runner = require('../lib/runner');

const slice = Array.prototype.slice;
const noop = () => {};

test('nested tests and hooks aren\'t allowed', t => {
	t.plan(1);

	const runner = new Runner();

	runner.test(() => {
		t.throws(() => {
			runner.test(noop);
		}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});
	});

	runner.run({}).then(() => {
		t.end();
	});
});

test('tests must be declared synchronously', t => {
	t.plan(1);

	const runner = new Runner();

	runner.test(() => Promise.resolve());

	runner.run({});

	t.throws(() => {
		runner.test(noop);
	}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});

	t.end();
});

test('runner emits a "test" event', t => {
	const runner = new Runner();

	runner.test('foo', a => {
		a.pass();
	});

	runner.on('test', props => {
		t.ifError(props.error);
		t.is(props.title, 'foo');
		t.not(props.duration, undefined);
		t.end();
	});

	runner.run({});
});

test('run serial tests before concurrent ones', t => {
	const runner = new Runner();
	const arr = [];

	runner.test(a => {
		arr.push('c');
		a.end();
	});

	runner.serial(a => {
		arr.push('a');
		a.end();
	});

	runner.serial(a => {
		arr.push('b');
		a.end();
	});

	runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('anything can be skipped', t => {
	const runner = new Runner();
	const arr = [];

	function pusher(title) {
		return () => {
			arr.push(title);
		};
	}

	runner.after(pusher('after'));
	runner.after.skip(pusher('after.skip'));

	runner.afterEach(pusher('afterEach'));
	runner.afterEach.skip(pusher('afterEach.skip'));

	runner.before(pusher('before'));
	runner.before.skip(pusher('before.skip'));

	runner.beforeEach(pusher('beforeEach'));
	runner.beforeEach.skip(pusher('beforeEach.skip'));

	runner.test(pusher('concurrent'));
	runner.test.skip(pusher('concurrent.skip'));

	runner.serial(pusher('serial'));
	runner.serial.skip(pusher('serial.skip'));

	runner.run({}).then(() => {
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
		t.end();
	});
});

test('include skipped tests in results', t => {
	const runner = new Runner();

	runner.before('before', noop);
	runner.before.skip('before.skip', noop);

	runner.beforeEach('beforeEach', noop);
	runner.beforeEach.skip('beforeEach.skip', noop);

	runner.test.serial('test', noop);
	runner.test.serial.skip('test.skip', noop);

	runner.after('after', noop);
	runner.after.skip('after.skip', noop);

	runner.afterEach('afterEach', noop);
	runner.afterEach.skip('afterEach.skip', noop);

	const titles = [];

	runner.on('test', test => {
		titles.push(test.title);
	});

	runner.run({}).then(() => {
		t.strictDeepEqual(titles, [
			'before',
			'before.skip',
			'beforeEach for test',
			'beforeEach.skip for test',
			'test',
			'afterEach for test',
			'afterEach.skip for test',
			'test.skip',
			'after',
			'after.skip'
		]);

		t.end();
	});
});

test('test types and titles', t => {
	t.plan(10);

	const fn = a => {
		a.pass();
	};

	function named(a) {
		a.pass();
	}

	const runner = new Runner();
	runner.before(named);
	runner.beforeEach(fn);
	runner.after(fn);
	runner.afterEach(named);
	runner.test('test', fn);

	// See https://github.com/avajs/ava/issues/1027
	const supportsFunctionNames = noop.name === 'noop';

	const tests = [
		{
			type: 'before',
			title: 'named'
		},
		{
			type: 'beforeEach',
			title: supportsFunctionNames ? 'fn for test' : 'beforeEach for test'
		},
		{
			type: 'test',
			title: 'test'
		},
		{
			type: 'afterEach',
			title: 'named for test'
		},
		{
			type: 'after',
			title: supportsFunctionNames ? 'fn' : 'after'
		}
	];

	runner.on('test', props => {
		const test = tests.shift();
		t.is(props.title, test.title);
		t.is(props.type, test.type);
	});

	runner.run({}).then(t.end);
});

test('skip test', t => {
	t.plan(5);

	const runner = new Runner();
	const arr = [];

	runner.test(() => {
		arr.push('a');
	});

	runner.skip(() => {
		arr.push('b');
	});

	t.throws(() => {
		runner.skip('should be a todo');
	}, TypeError, 'Expected an implementation. Use `test.todo()` for tests without an implementation.');

	runner.run({}).then(stats => {
		t.is(stats.testCount, 2);
		t.is(stats.passCount, 1);
		t.is(stats.skipCount, 1);
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('test throws when given no function', t => {
	t.plan(1);

	const runner = new Runner();

	t.throws(() => {
		runner.test();
	}, TypeError, 'Expected an implementation. Use `test.todo()` for tests without an implementation.');
});

test('todo test', t => {
	t.plan(6);

	const runner = new Runner();
	const arr = [];

	runner.test(() => {
		arr.push('a');
	});

	runner.todo('todo');

	t.throws(() => {
		runner.todo('todo', () => {});
	}, TypeError, '`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.');

	t.throws(() => {
		runner.todo();
	}, TypeError, '`todo` tests require a title');

	runner.run({}).then(stats => {
		t.is(stats.testCount, 2);
		t.is(stats.passCount, 1);
		t.is(stats.todoCount, 1);
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('only test', t => {
	t.plan(3);

	const runner = new Runner();
	const arr = [];

	runner.test(() => {
		arr.push('a');
	});

	runner.only(() => {
		arr.push('b');
	});

	runner.run({}).then(stats => {
		t.is(stats.testCount, 1);
		t.is(stats.passCount, 1);
		t.strictDeepEqual(arr, ['b']);
		t.end();
	});
});

test('throws if you try to set a hook as exclusive', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.beforeEach.only('', noop);
	}, TypeError, '`only` is only for tests and cannot be used with hooks');

	t.end();
});

test('throws if you try to set a before hook as always', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.before.always('', noop);
	}, TypeError, '`always` can only be used with `after` and `afterEach`');

	t.end();
});

test('throws if you try to set a test as always', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.test.always('', noop);
	}, TypeError, '`always` can only be used with `after` and `afterEach`');

	t.end();
});

test('throws if you give a function to todo', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.test.todo('todo with function', noop);
	}, TypeError, '`todo` tests are not allowed to have an implementation. Use ' +
	'`test.skip()` for tests with an implementation.');

	t.end();
});

test('throws if todo has no title', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.test.todo();
	}, TypeError, '`todo` tests require a title');

	t.end();
});

test('throws if todo has failing, skip, or only', t => {
	const runner = new Runner();

	const errorMessage = '`todo` tests are just for documentation and cannot be' +
		' used with `skip`, `only`, or `failing`';

	t.throws(() => {
		runner.test.failing.todo('test');
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.test.skip.todo('test');
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.test.only.todo('test');
	}, TypeError, errorMessage);

	t.end();
});

test('throws if todo isn\'t a test', t => {
	const runner = new Runner();

	const errorMessage = '`todo` is only for documentation of future tests and' +
		' cannot be used with hooks';

	t.throws(() => {
		runner.before.todo('test');
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.beforeEach.todo('test');
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.after.todo('test');
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.afterEach.todo('test');
	}, TypeError, errorMessage);

	t.end();
});

test('throws if test has skip and only', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.test.only.skip('test', noop);
	}, TypeError, '`only` tests cannot be skipped');

	t.end();
});

test('throws if failing is used on non-tests', t => {
	const runner = new Runner();

	const errorMessage = '`failing` is only for tests and cannot be used with hooks';

	t.throws(() => {
		runner.beforeEach.failing('', noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.before.failing('', noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.afterEach.failing('', noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.after.failing('', noop);
	}, TypeError, errorMessage);

	t.end();
});

test('throws if only is used on non-tests', t => {
	const runner = new Runner();

	const errorMessage = '`only` is only for tests and cannot be used with hooks';

	t.throws(() => {
		runner.beforeEach.only(noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.before.only(noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.afterEach.only(noop);
	}, TypeError, errorMessage);

	t.throws(() => {
		runner.after.only(noop);
	}, TypeError, errorMessage);

	t.end();
});

test('validate accepts skipping failing tests', t => {
	t.plan(2);

	const runner = new Runner();

	runner.test.skip.failing('skip failing', noop);

	runner.run({}).then(function (stats) {
		t.is(stats.testCount, 1);
		t.is(stats.skipCount, 1);
		t.end();
	});
});

test('runOnlyExclusive option test', t => {
	t.plan(1);

	const runner = new Runner();
	const options = {runOnlyExclusive: true};
	const arr = [];

	runner.test(() => {
		arr.push('a');
	});

	runner.run(options).then(stats => {
		t.is(stats, null);
		t.end();
	});
});

test('options.serial forces all tests to be serial', t => {
	t.plan(1);

	const runner = new Runner({serial: true});
	const arr = [];

	runner.cb(a => {
		setTimeout(() => {
			arr.push(1);
			a.end();
		}, 200);
	});

	runner.cb(a => {
		setTimeout(() => {
			arr.push(2);
			a.end();
		}, 100);
	});

	runner.test(() => {
		t.strictDeepEqual(arr, [1, 2]);
		t.end();
	});

	runner.run({});
});

test('options.bail will bail out', t => {
	t.plan(1);

	const runner = new Runner({bail: true});

	runner.test(a => {
		t.pass();
		a.fail();
	});

	runner.test(() => {
		t.fail();
	});

	runner.run({}).then(() => {
		t.end();
	});
});

test('options.bail will bail out (async)', t => {
	t.plan(2);

	const runner = new Runner({bail: true});
	const tests = [];

	runner.cb(a => {
		setTimeout(() => {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
	});

	runner.cb(a => {
		setTimeout(() => {
			tests.push(2);
			a.end();
		}, 300);
	});

	runner.run({}).then(() => {
		t.strictDeepEqual(tests, [1]);
		// With concurrent tests there is no stopping the second `setTimeout` callback from happening.
		// See the `bail + serial` test below for comparison
		setTimeout(() => {
			t.strictDeepEqual(tests, [1, 2]);
			t.end();
		}, 250);
	});
});

test('options.bail + serial - tests will never happen (async)', t => {
	t.plan(2);

	const runner = new Runner({
		bail: true,
		serial: true
	});
	const tests = [];

	runner.cb(a => {
		setTimeout(() => {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
	});

	runner.cb(a => {
		setTimeout(() => {
			tests.push(2);
			a.end();
		}, 300);
	});

	runner.run({}).then(() => {
		t.strictDeepEqual(tests, [1]);
		setTimeout(() => {
			t.strictDeepEqual(tests, [1]);
			t.end();
		}, 250);
	});
});

test('options.match will not run tests with non-matching titles', t => {
	t.plan(5);

	const runner = new Runner({
		match: ['*oo', '!foo']
	});

	runner.test('mhm. grass tasty. moo', () => {
		t.pass();
	});

	runner.test('juggaloo', () => {
		t.pass();
	});

	runner.test('foo', () => {
		t.fail();
	});

	runner.test(() => {
		t.fail();
	});

	runner.run({}).then(stats => {
		t.is(stats.skipCount, 0);
		t.is(stats.passCount, 2);
		t.is(stats.testCount, 2);
		t.end();
	});
});

test('options.match hold no effect on hooks with titles', t => {
	t.plan(4);

	const runner = new Runner({
		match: ['!before*']
	});

	let actual;

	runner.before('before hook with title', () => {
		actual = 'foo';
	});

	runner.test('after', () => {
		t.is(actual, 'foo');
	});

	runner.run({}).then(stats => {
		t.is(stats.skipCount, 0);
		t.is(stats.passCount, 1);
		t.is(stats.testCount, 1);
		t.end();
	});
});

test('options.match overrides .only', t => {
	t.plan(5);

	const runner = new Runner({
		match: ['*oo']
	});

	runner.test('moo', () => {
		t.pass();
	});

	runner.test.only('boo', () => {
		t.pass();
	});

	runner.run({}).then(stats => {
		t.is(stats.skipCount, 0);
		t.is(stats.passCount, 2);
		t.is(stats.testCount, 2);
		t.end();
	});
});

test('macros: Additional args will be spread as additional args on implementation function', t => {
	t.plan(3);

	const runner = new Runner();

	runner.test('test1', function () {
		t.deepEqual(slice.call(arguments, 1), ['foo', 'bar']);
	}, 'foo', 'bar');

	runner.run({}).then(stats => {
		t.is(stats.passCount, 1);
		t.is(stats.testCount, 1);
		t.end();
	});
});

test('macros: Customize test names attaching a `title` function', t => {
	t.plan(8);

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

	function macroFn(avaT) {
		t.is(avaT.title, expectedTitles.shift());
		t.deepEqual(slice.call(arguments, 1), expectedArgs.shift());
	}

	macroFn.title = (title, firstArg) => (title || 'default') + firstArg;

	const runner = new Runner();

	runner.test(macroFn, 'A');
	runner.test('supplied', macroFn, 'B');
	runner.test(macroFn, 'C');

	runner.run({}).then(stats => {
		t.is(stats.passCount, 3);
		t.is(stats.testCount, 3);
		t.end();
	});
});

test('match applies to macros', t => {
	t.plan(3);

	function macroFn(avaT) {
		t.is(avaT.title, 'foobar');
	}

	macroFn.title = (title, firstArg) => `${firstArg}bar`;

	const runner = new Runner({
		match: ['foobar']
	});

	runner.test(macroFn, 'foo');
	runner.test(macroFn, 'bar');

	runner.run({}).then(stats => {
		t.is(stats.passCount, 1);
		t.is(stats.testCount, 1);
		t.end();
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

	function macroFnA() {
		t.deepEqual(slice.call(arguments, 1), expectedArgsA.shift());
	}

	function macroFnB() {
		t.deepEqual(slice.call(arguments, 1), expectedArgsB.shift());
	}

	const runner = new Runner();

	runner.test([macroFnA, macroFnB], 'A');
	runner.test([macroFnA, macroFnB], 'B');
	runner.test(macroFnA, 'C');
	runner.test(macroFnB, 'D');

	runner.run({}).then(stats => {
		t.is(stats.passCount, 6);
		t.is(stats.testCount, 6);
		t.is(expectedArgsA.length, 0);
		t.is(expectedArgsB.length, 0);
		t.end();
	});
});

test('match applies to arrays of macros', t => {
	t.plan(3);

	// Foo
	function fooMacro() {
		t.fail();
	}
	fooMacro.title = (title, firstArg) => `${firstArg}foo`;

	function barMacro(avaT) {
		t.is(avaT.title, 'foobar');
	}
	barMacro.title = (title, firstArg) => `${firstArg}bar`;

	function bazMacro() {
		t.fail();
	}
	bazMacro.title = firstArg => `${firstArg}baz`;

	const runner = new Runner({
		match: ['foobar']
	});

	runner.test([fooMacro, barMacro, bazMacro], 'foo');
	runner.test([fooMacro, barMacro, bazMacro], 'bar');

	runner.run({}).then(stats => {
		t.is(stats.passCount, 1);
		t.is(stats.testCount, 1);
		t.end();
	});
});
