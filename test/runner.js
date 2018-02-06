'use strict';
require('../lib/worker-options').set({});

const test = require('tap').test;
const Runner = require('../lib/runner');

const slice = Array.prototype.slice;
const noop = () => {};

test('nested tests and hooks aren\'t allowed', t => {
	t.plan(1);

	const runner = new Runner();

	runner.chain('test', a => {
		t.throws(() => {
			runner.chain(noop);
		}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});
		a.pass();
	});

	runner.run({}).then(() => {
		t.end();
	});
});

test('tests must be declared synchronously', t => {
	t.plan(1);

	const runner = new Runner();

	runner.chain('test', a => {
		a.pass();
		return Promise.resolve();
	});

	runner.run({});

	t.throws(() => {
		runner.chain(noop);
	}, {message: 'All tests and hooks must be declared synchronously in your test file, and cannot be nested within other tests or hooks.'});

	t.end();
});

test('runner emits a "test" event', t => {
	const runner = new Runner();

	runner.chain('foo', a => {
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

	runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('anything can be skipped', t => {
	const runner = new Runner();
	const arr = [];

	function pusher(title) {
		return a => {
			arr.push(title);
			a.pass();
		};
	}

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

	runner.chain.before('before', noop);
	runner.chain.before.skip('before.skip', noop);

	runner.chain.beforeEach('beforeEach', noop);
	runner.chain.beforeEach.skip('beforeEach.skip', noop);

	runner.chain.serial('test', a => a.pass());
	runner.chain.serial.skip('test.skip', noop);

	runner.chain.after('after', noop);
	runner.chain.after.skip('after.skip', noop);

	runner.chain.afterEach('afterEach', noop);
	runner.chain.afterEach.skip('afterEach.skip', noop);

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
	runner.chain.before(named);
	runner.chain.beforeEach(fn);
	runner.chain.after(fn);
	runner.chain.afterEach(named);
	runner.chain('test', fn);

	const tests = [
		{
			type: 'before',
			title: 'before hook'
		},
		{
			type: 'beforeEach',
			title: 'beforeEach hook for test'
		},
		{
			type: 'test',
			title: 'test'
		},
		{
			type: 'afterEach',
			title: 'afterEach hook for test'
		},
		{
			type: 'after',
			title: 'after hook'
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

	runner.chain('test', a => {
		arr.push('a');
		a.pass();
	});

	runner.chain.skip('skip', () => {
		arr.push('b');
	});

	t.throws(() => {
		runner.chain.skip('should be a todo');
	}, new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.'));

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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
		runner.chain();
	}, new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.'));
});

test('todo test', t => {
	t.plan(6);

	const runner = new Runner();
	const arr = [];

	runner.chain('test', a => {
		arr.push('a');
		a.pass();
	});

	runner.chain.todo('todo');

	t.throws(() => {
		runner.chain.todo('todo', () => {});
	}, new TypeError('`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.'));

	t.throws(() => {
		runner.chain.todo();
	}, new TypeError('`todo` tests require a title'));

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	runner.chain('test', a => {
		arr.push('a');
		a.pass();
	});

	runner.chain.only('only', a => {
		arr.push('b');
		a.pass();
	});

	runner.run({}).then(() => {
		const stats = runner.buildStats();
		t.is(stats.testCount, 1);
		t.is(stats.passCount, 1);
		t.strictDeepEqual(arr, ['b']);
		t.end();
	});
});

test('throws if you give a function to todo', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.chain.todo('todo with function', noop);
	}, new TypeError('`todo` tests are not allowed to have an implementation. Use ' +
	'`test.skip()` for tests with an implementation.'));

	t.end();
});

test('throws if todo has no title', t => {
	const runner = new Runner();

	t.throws(() => {
		runner.chain.todo();
	}, new TypeError('`todo` tests require a title'));

	t.end();
});

test('validate accepts skipping failing tests', t => {
	t.plan(2);

	const runner = new Runner();

	runner.chain.failing.skip('skip failing', noop);

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	runner.chain('test', () => {
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
		t.end();
	});

	runner.run({});
});

test('options.bail will bail out', t => {
	t.plan(1);

	const runner = new Runner({bail: true});

	runner.chain('test', a => {
		t.pass();
		a.fail();
	});

	runner.chain('test 2', () => {
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

	runner.chain.cb('cb', a => {
		setTimeout(() => {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
		a.pass();
	});

	runner.chain.cb('cb 2', a => {
		setTimeout(() => {
			tests.push(2);
			a.end();
		}, 300);
		a.pass();
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

	runner.chain.cb('cb', a => {
		setTimeout(() => {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
	});

	runner.chain.cb('cb 2', a => {
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

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	runner.chain.before('before hook with title', () => {
		actual = 'foo';
	});

	runner.chain('after', a => {
		t.is(actual, 'foo');
		a.pass();
	});

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	runner.chain('moo', a => {
		t.pass();
		a.pass();
	});

	runner.chain.only('boo', a => {
		t.pass();
		a.pass();
	});

	runner.run({}).then(() => {
		const stats = runner.buildStats();
		t.is(stats.skipCount, 0);
		t.is(stats.passCount, 2);
		t.is(stats.testCount, 2);
		t.end();
	});
});

test('macros: Additional args will be spread as additional args on implementation function', t => {
	t.plan(3);

	const runner = new Runner();

	runner.chain('test1', function (a) {
		t.deepEqual(slice.call(arguments, 1), ['foo', 'bar']);
		a.pass();
	}, 'foo', 'bar');

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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
		t.deepEqual(slice.call(arguments, 1), expectedArgs.shift());
		avaT.pass();
	}

	macroFn.title = (title, firstArg) => (title || 'default') + firstArg;

	const runner = new Runner();

	runner.on('test', props => {
		t.is(props.title, expectedTitles.shift());
	});

	runner.chain(macroFn, 'A');
	runner.chain('supplied', macroFn, 'B');
	runner.chain(macroFn, 'C');

	runner.run({}).then(() => {
		const stats = runner.buildStats();
		t.is(stats.passCount, 3);
		t.is(stats.testCount, 3);
		t.end();
	});
});

test('match applies to macros', t => {
	t.plan(3);

	function macroFn(avaT) {
		avaT.pass();
	}

	macroFn.title = (title, firstArg) => `${firstArg}bar`;

	const runner = new Runner({
		match: ['foobar']
	});

	runner.on('test', props => {
		t.is(props.title, 'foobar');
	});

	runner.chain(macroFn, 'foo');
	runner.chain(macroFn, 'bar');

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	function macroFnA(a) {
		t.deepEqual(slice.call(arguments, 1), expectedArgsA.shift());
		a.pass();
	}
	macroFnA.title = prefix => `${prefix}.A`;

	function macroFnB(a) {
		t.deepEqual(slice.call(arguments, 1), expectedArgsB.shift());
		a.pass();
	}
	macroFnB.title = prefix => `${prefix}.B`;

	const runner = new Runner();

	runner.chain('A', [macroFnA, macroFnB], 'A');
	runner.chain('B', [macroFnA, macroFnB], 'B');
	runner.chain('C', macroFnA, 'C');
	runner.chain('D', macroFnB, 'D');

	runner.run({}).then(() => {
		const stats = runner.buildStats();
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

	const runner = new Runner({
		match: ['foobar']
	});

	runner.on('test', props => {
		t.is(props.title, 'foobar');
	});

	runner.chain([fooMacro, barMacro, bazMacro], 'foo');
	runner.chain([fooMacro, barMacro, bazMacro], 'bar');

	runner.run({}).then(() => {
		const stats = runner.buildStats();
		t.is(stats.passCount, 1);
		t.is(stats.testCount, 1);
		t.end();
	});
});
