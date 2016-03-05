'use strict';
var test = require('tap').test;
var Runner = require('../lib/runner');

var noop = function () {};

test('must be called with new', function (t) {
	t.throws(function () {
		var runner = Runner;
		runner();
	}, {message: 'Class constructor Runner cannot be invoked without \'new\''});
	t.end();
});

test('runner emits a "test" event', function (t) {
	var runner = new Runner();

	runner.test(function foo(a) {
		a.pass();
	});

	runner.on('test', function (props) {
		t.ifError(props.error);
		t.is(props.title, 'foo');
		t.not(props.duration, undefined);
		t.end();
	});

	runner.run({});
});

test('run serial tests before concurrent ones', function (t) {
	var runner = new Runner();
	var arr = [];

	runner.test(function (a) {
		arr.push('c');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('a');
		a.end();
	});

	runner.serial(function (a) {
		arr.push('b');
		a.end();
	});

	runner.run({}).then(function () {
		t.same(arr, ['a', 'b', 'c']);
		t.end();
	});
});

test('anything can be skipped', function (t) {
	var runner = new Runner();
	var arr = [];

	function pusher(title) {
		return function () {
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

	runner.run({}).then(function () {
		// Note that afterEach and beforeEach run twice because there are two actual tests - "serial" and "concurrent"
		t.same(arr, [
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

test('include skipped tests in results', function (t) {
	var runner = new Runner();

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

	var titles = [];

	runner.on('test', function (test) {
		titles.push(test.title);
	});

	runner.run({}).then(function () {
		t.same(titles, [
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

test('test types and titles', function (t) {
	t.plan(10);

	var fn = function (a) {
		a.pass();
	};

	function named(a) {
		a.pass();
	}

	var runner = new Runner();
	runner.before(named);
	runner.beforeEach(fn);
	runner.after(fn);
	runner.afterEach(named);
	runner.test('test', fn);

	var tests = [
		{type: 'before', title: 'named'},
		{type: 'beforeEach', title: 'beforeEach for test'},
		{type: 'test', title: 'test'},
		{type: 'afterEach', title: 'named for test'},
		{type: 'after', title: 'after'}
	];

	runner.on('test', function (props) {
		var test = tests.shift();

		t.is(props.title, test.title);
		t.is(props.type, test.type);
	});

	runner.run({}).then(t.end);
});

test('skip test', function (t) {
	t.plan(5);

	var runner = new Runner();
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.skip(function () {
		arr.push('b');
	});

	t.throws(function () {
		runner.skip('should be a todo');
	}, {message: 'Expected a function. Use `test.todo()` for tests without a function.'});

	runner.run({}).then(function () {
		t.is(runner.stats.testCount, 2);
		t.is(runner.stats.passCount, 1);
		t.is(runner.stats.skipCount, 1);
		t.same(arr, ['a']);
		t.end();
	});
});

test('todo test', function (t) {
	t.plan(5);

	var runner = new Runner();
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.todo('todo');

	t.throws(function () {
		runner.todo(function () {});
	}, {message: '`todo` tests require a title'});

	runner.run({}).then(function () {
		t.is(runner.stats.testCount, 2);
		t.is(runner.stats.passCount, 1);
		t.is(runner.stats.todoCount, 1);
		t.same(arr, ['a']);
		t.end();
	});
});

test('only test', function (t) {
	t.plan(3);

	var runner = new Runner();
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.only(function () {
		arr.push('b');
	});

	runner.run({}).then(function () {
		t.is(runner.stats.testCount, 1);
		t.is(runner.stats.passCount, 1);
		t.same(arr, ['b']);
		t.end();
	});
});

test('runOnlyExclusive option test', function (t) {
	t.plan(4);

	var runner = new Runner();
	var options = {runOnlyExclusive: true};
	var arr = [];

	runner.test(function () {
		arr.push('a');
	});

	runner.run(options).then(function () {
		t.is(runner.stats.failCount, 0);
		t.is(runner.stats.passCount, 0);
		t.is(runner.stats.skipCount, 0);
		t.is(runner.stats.testCount, 0);
		t.end();
	});
});

test('options.serial forces all tests to be serial', function (t) {
	t.plan(1);

	var runner = new Runner({serial: true});
	var arr = [];

	runner.cb(function (a) {
		setTimeout(function () {
			arr.push(1);
			a.end();
		}, 200);
	});

	runner.cb(function (a) {
		setTimeout(function () {
			arr.push(2);
			a.end();
		}, 100);
	});

	runner.test(function () {
		t.same(arr, [1, 2]);
		t.end();
	});

	runner.run({});
});

test('options.bail will bail out', function (t) {
	t.plan(1);

	var runner = new Runner({bail: true});

	runner.test(function (a) {
		t.pass();
		a.fail();
	});

	runner.test(function () {
		t.fail();
	});

	runner.run({}).then(function () {
		t.end();
	});
});

test('options.bail will bail out (async)', function (t) {
	t.plan(2);

	var runner = new Runner({bail: true});
	var tests = [];

	runner.cb(function (a) {
		setTimeout(function () {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
	});

	runner.cb(function (a) {
		setTimeout(function () {
			tests.push(2);
			a.end();
		}, 300);
	});

	runner.run({}).then(function () {
		t.same(tests, [1]);
		// With concurrent tests there is no stopping the second `setTimeout` callback from happening.
		// See the `bail + serial` test below for comparison
		setTimeout(function () {
			t.same(tests, [1, 2]);
			t.end();
		}, 250);
	});
});

test('options.bail + serial - tests will never happen (async)', function (t) {
	t.plan(2);

	var runner = new Runner({bail: true, serial: true});
	var tests = [];

	runner.cb(function (a) {
		setTimeout(function () {
			tests.push(1);
			a.fail();
			a.end();
		}, 100);
	});

	runner.cb(function (a) {
		setTimeout(function () {
			tests.push(2);
			a.end();
		}, 300);
	});

	runner.run({}).then(function () {
		t.same(tests, [1]);
		setTimeout(function () {
			t.same(tests, [1]);
			t.end();
		}, 250);
	});
});

test('options.match will not run tests with non-matching titles', function (t) {
	t.plan(5);

	var runner = new Runner({
		match: ['*oo', '!foo']
	});

	runner.test('mhm. grass tasty. moo', function () {
		t.pass();
	});

	runner.test('juggaloo', function () {
		t.pass();
	});

	runner.test('foo', function () {
		t.fail();
	});

	runner.test(function () {
		t.fail();
	});

	runner.run({}).then(function () {
		t.is(runner.stats.skipCount, 0);
		t.is(runner.stats.passCount, 2);
		t.is(runner.stats.testCount, 2);
		t.end();
	});
});

test('options.match hold no effect on hooks with titles', function (t) {
	t.plan(4);

	var runner = new Runner({
		match: ['!before*']
	});

	var actual;

	runner.before('before hook with title', function () {
		actual = 'foo';
	});

	runner.test('after', function () {
		t.is(actual, 'foo');
	});

	runner.run({}).then(function () {
		t.is(runner.stats.skipCount, 0);
		t.is(runner.stats.passCount, 1);
		t.is(runner.stats.testCount, 1);
		t.end();
	});
});

test('options.match overrides .only', function (t) {
	t.plan(5);

	var runner = new Runner({
		match: ['*oo']
	});

	runner.test('moo', function () {
		t.pass();
	});

	runner.test.only('boo', function () {
		t.pass();
	});

	runner.run({}).then(function () {
		t.is(runner.stats.skipCount, 0);
		t.is(runner.stats.passCount, 2);
		t.is(runner.stats.testCount, 2);
		t.end();
	});
});
