'use strict';
const path = require('path');
const test = require('tap').test;
const Runner = require('../lib/runner');
const _fork = require('../lib/fork.js');
const CachingPrecompiler = require('../lib/caching-precompiler');

const cacheDir = path.join(__dirname, '../node_modules/.cache/ava');
const precompiler = new CachingPrecompiler({
	babelCacheKeys: {},
	getBabelOptions() {
		return {
			babelrc: false,
			presets: [require.resolve('@ava/babel-preset-stage-4')]
		};
	},
	path: cacheDir
});

function fork(testPath) {
	const hash = precompiler.precompileFile(testPath);
	const precompiled = {};
	precompiled[testPath] = hash;

	return _fork(testPath, {
		cacheDir,
		precompiled
	});
}

test('before', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.before(() => {
		arr.push('a');
	});

	runner.test(() => {
		arr.push('b');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b']);
	});
});

test('after', t => {
	t.plan(3);

	const runner = new Runner();
	const arr = [];

	runner.after(() => {
		arr.push('b');
	});

	runner.test(() => {
		arr.push('a');
	});

	return runner.run({}).then(stats => {
		t.is(stats.passCount, 1);
		t.is(stats.failCount, 0);
		t.strictDeepEqual(arr, ['a', 'b']);
		t.end();
	});
});

test('after not run if test failed', t => {
	t.plan(3);

	const runner = new Runner();
	const arr = [];

	runner.after(() => {
		arr.push('a');
	});

	runner.test(() => {
		throw new Error('something went wrong');
	});
	return runner.run({}).then(stats => {
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('after.always run even if test failed', t => {
	t.plan(3);

	const runner = new Runner();
	const arr = [];

	runner.after.always(() => {
		arr.push('a');
	});

	runner.test(() => {
		throw new Error('something went wrong');
	});
	return runner.run({}).then(stats => {
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('after.always run even if before failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.before(() => {
		throw new Error('something went wrong');
	});

	runner.after.always(() => {
		arr.push('a');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('stop if before hooks failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.before(() => {
		arr.push('a');
	});

	runner.before(() => {
		throw new Error('something went wrong');
	});

	runner.test(a => {
		arr.push('b');
		a.end();
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('before each with concurrent tests', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [[], []];
	let i = 0;
	let k = 0;

	runner.beforeEach(() => {
		arr[i++].push('a');
	});

	runner.beforeEach(() => {
		arr[k++].push('b');
	});

	runner.test(() => {
		arr[0].push('c');
	});

	runner.test(() => {
		arr[1].push('d');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, [['a', 'b', 'c'], ['a', 'b', 'd']]);
		t.end();
	});
});

test('before each with serial tests', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.beforeEach(() => {
		arr.push('a');
	});

	runner.beforeEach(() => {
		arr.push('b');
	});

	runner.serial(() => {
		arr.push('c');
	});

	runner.serial(() => {
		arr.push('d');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b', 'c', 'a', 'b', 'd']);
		t.end();
	});
});

test('fail if beforeEach hook fails', t => {
	t.plan(2);

	const runner = new Runner();
	const arr = [];

	runner.beforeEach(a => {
		arr.push('a');
		a.fail();
	});

	runner.test(a => {
		arr.push('b');
		a.pass();
	});

	return runner.run({}).then(stats => {
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('after each with concurrent tests', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [[], []];
	let i = 0;
	let k = 0;

	runner.afterEach(() => {
		arr[i++].push('a');
	});

	runner.afterEach(() => {
		arr[k++].push('b');
	});

	runner.test(() => {
		arr[0].push('c');
	});

	runner.test(() => {
		arr[1].push('d');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, [['c', 'a', 'b'], ['d', 'a', 'b']]);
		t.end();
	});
});

test('after each with serial tests', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.afterEach(() => {
		arr.push('a');
	});

	runner.afterEach(() => {
		arr.push('b');
	});

	runner.serial(() => {
		arr.push('c');
	});

	runner.serial(() => {
		arr.push('d');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['c', 'a', 'b', 'd', 'a', 'b']);
		t.end();
	});
});

test('afterEach not run if concurrent tests failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.afterEach(() => {
		arr.push('a');
	});

	runner.test(() => {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('afterEach not run if serial tests failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.afterEach(() => {
		arr.push('a');
	});

	runner.serial(() => {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, []);
		t.end();
	});
});

test('afterEach.always run even if concurrent tests failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.afterEach.always(() => {
		arr.push('a');
	});

	runner.test(() => {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('afterEach.always run even if serial tests failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.afterEach.always(() => {
		arr.push('a');
	});

	runner.serial(() => {
		throw new Error('something went wrong');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['a']);
		t.end();
	});
});

test('afterEach.always run even if beforeEach failed', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.beforeEach(() => {
		throw new Error('something went wrong');
	});

	runner.test(() => {
		arr.push('a');
	});

	runner.afterEach.always(() => {
		arr.push('b');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['b']);
		t.end();
	});
});

test('ensure hooks run only around tests', t => {
	t.plan(1);

	const runner = new Runner();
	const arr = [];

	runner.beforeEach(() => {
		arr.push('beforeEach');
	});

	runner.before(() => {
		arr.push('before');
	});

	runner.afterEach(() => {
		arr.push('afterEach');
	});

	runner.after(() => {
		arr.push('after');
	});

	runner.test(() => {
		arr.push('test');
	});

	return runner.run({}).then(() => {
		t.strictDeepEqual(arr, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
		t.end();
	});
});

test('shared context', t => {
	t.plan(1);

	const runner = new Runner();

	runner.before(a => {
		a.is(a.context, null);
	});

	runner.after(a => {
		a.is(a.context, null);
	});

	runner.beforeEach(a => {
		a.context.arr = ['a'];
	});

	runner.test(a => {
		a.context.arr.push('b');
		a.deepEqual(a.context.arr, ['a', 'b']);
	});

	runner.afterEach(a => {
		a.context.arr.push('c');
		a.deepEqual(a.context.arr, ['a', 'b', 'c']);
	});

	return runner.run({}).then(stats => {
		t.is(stats.failCount, 0);
		t.end();
	});
});

test('shared context of any type', t => {
	t.plan(1);

	const runner = new Runner();

	runner.beforeEach(a => {
		a.context = 'foo';
	});

	runner.test(a => {
		a.is(a.context, 'foo');
	});

	return runner.run({}).then(stats => {
		t.is(stats.failCount, 0);
		t.end();
	});
});

test('don\'t display hook title if it did not fail', t => {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture/hooks-passing.js'))
		.run({})
		.on('test', test => {
			t.strictDeepEqual(test.error, null);
			t.is(test.title, 'pass');
		})
		.then(() => {
			t.end();
		});
});

test('display hook title if it failed', t => {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture/hooks-failing.js'))
		.run({})
		.on('test', test => {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'fail for pass');
		})
		.then(() => {
			t.end();
		});
});
