'use strict';
require('../lib/worker-options').set({});

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

const promiseEnd = (runner, next) => {
	return new Promise(resolve => {
		runner.on('start', resolve);
		next(runner);
	}).then(() => runner);
};

test('before', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.before(() => {
			arr.push('a');
		});

		runner.chain('test', a => {
			a.pass();
			arr.push('b');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b']);
	});
});

test('after', t => {
	t.plan(3);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.after(() => {
			arr.push('b');
		});

		runner.chain('test', a => {
			a.pass();
			arr.push('a');
		});
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.passCount, 1);
		t.is(stats.failCount, 0);
		t.strictDeepEqual(arr, ['a', 'b']);
	});
});

test('after not run if test failed', t => {
	t.plan(3);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.after(() => {
			arr.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, []);
	});
});

test('after.always run even if test failed', t => {
	t.plan(3);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.after.always(() => {
			arr.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.passCount, 0);
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
	});
});

test('after.always run even if before failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.before(() => {
			throw new Error('something went wrong');
		});

		runner.chain.after.always(() => {
			arr.push('a');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('stop if before hooks failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.before(() => {
			arr.push('a');
		});

		runner.chain.before(() => {
			throw new Error('something went wrong');
		});

		runner.chain('test', a => {
			a.pass();
			arr.push('b');
			a.end();
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('before each with concurrent tests', t => {
	t.plan(1);

	const arr = [[], []];
	return promiseEnd(new Runner(), runner => {
		let i = 0;
		let k = 0;

		runner.chain.beforeEach(() => {
			arr[i++].push('a');
		});

		runner.chain.beforeEach(() => {
			arr[k++].push('b');
		});

		runner.chain('c', a => {
			a.pass();
			arr[0].push('c');
		});

		runner.chain('d', a => {
			a.pass();
			arr[1].push('d');
		});
	}).then(() => {
		t.strictDeepEqual(arr, [['a', 'b', 'c'], ['a', 'b', 'd']]);
	});
});

test('before each with serial tests', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.beforeEach(() => {
			arr.push('a');
		});

		runner.chain.beforeEach(() => {
			arr.push('b');
		});

		runner.chain.serial('c', a => {
			a.pass();
			arr.push('c');
		});

		runner.chain.serial('d', a => {
			a.pass();
			arr.push('d');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a', 'b', 'c', 'a', 'b', 'd']);
	});
});

test('fail if beforeEach hook fails', t => {
	t.plan(2);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.beforeEach(a => {
			arr.push('a');
			a.fail();
		});

		runner.chain('test', a => {
			arr.push('b');
			a.pass();
		});
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.failCount, 1);
		t.strictDeepEqual(arr, ['a']);
	});
});

test('after each with concurrent tests', t => {
	t.plan(1);

	const arr = [[], []];
	return promiseEnd(new Runner(), runner => {
		let i = 0;
		let k = 0;

		runner.chain.afterEach(() => {
			arr[i++].push('a');
		});

		runner.chain.afterEach(() => {
			arr[k++].push('b');
		});

		runner.chain('c', a => {
			a.pass();
			arr[0].push('c');
		});

		runner.chain('d', a => {
			a.pass();
			arr[1].push('d');
		});
	}).then(() => {
		t.strictDeepEqual(arr, [['c', 'a', 'b'], ['d', 'a', 'b']]);
	});
});

test('after each with serial tests', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.afterEach(() => {
			arr.push('a');
		});

		runner.chain.afterEach(() => {
			arr.push('b');
		});

		runner.chain.serial('c', a => {
			a.pass();
			arr.push('c');
		});

		runner.chain.serial('d', a => {
			a.pass();
			arr.push('d');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['c', 'a', 'b', 'd', 'a', 'b']);
	});
});

test('afterEach not run if concurrent tests failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.afterEach(() => {
			arr.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictDeepEqual(arr, []);
	});
});

test('afterEach not run if serial tests failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.afterEach(() => {
			arr.push('a');
		});

		runner.chain.serial('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictDeepEqual(arr, []);
	});
});

test('afterEach.always run even if concurrent tests failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.afterEach.always(() => {
			arr.push('a');
		});

		runner.chain('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('afterEach.always run even if serial tests failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.afterEach.always(() => {
			arr.push('a');
		});

		runner.chain.serial('test', () => {
			throw new Error('something went wrong');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['a']);
	});
});

test('afterEach.always run even if beforeEach failed', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.beforeEach(() => {
			throw new Error('something went wrong');
		});

		runner.chain('test', a => {
			a.pass();
			arr.push('a');
		});

		runner.chain.afterEach.always(() => {
			arr.push('b');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['b']);
	});
});

test('ensure hooks run only around tests', t => {
	t.plan(1);

	const arr = [];
	return promiseEnd(new Runner(), runner => {
		runner.chain.beforeEach(() => {
			arr.push('beforeEach');
		});

		runner.chain.before(() => {
			arr.push('before');
		});

		runner.chain.afterEach(() => {
			arr.push('afterEach');
		});

		runner.chain.after(() => {
			arr.push('after');
		});

		runner.chain('test', a => {
			a.pass();
			arr.push('test');
		});
	}).then(() => {
		t.strictDeepEqual(arr, ['before', 'beforeEach', 'test', 'afterEach', 'after']);
	});
});

test('shared context', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
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
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.failCount, 0);
	});
});

test('shared context of any type', t => {
	t.plan(1);

	return promiseEnd(new Runner(), runner => {
		runner.chain.beforeEach(a => {
			a.context = 'foo';
		});

		runner.chain('test', a => {
			a.pass();
			a.is(a.context, 'foo');
		});
	}).then(runner => {
		const stats = runner.buildStats();
		t.is(stats.failCount, 0);
	});
});

test('don\'t display hook title if it did not fail', t => {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture/hooks-passing.js'))
		.on('test', test => {
			t.strictDeepEqual(test.error, null);
			t.is(test.title, 'pass');
		});
});

test('display hook title if it failed', t => {
	t.plan(2);

	return fork(path.join(__dirname, 'fixture/hooks-failing.js'))
		.on('test', test => {
			t.is(test.error.name, 'AssertionError');
			t.is(test.title, 'beforeEach hook for pass');
		});
});
