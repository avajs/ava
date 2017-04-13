'use strict';
const test = require('tap').test;
const TestCollection = require('../lib/test-collection');

function defaults() {
	return {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		callback: false,
		always: false
	};
}

function metadata(opts) {
	return Object.assign(defaults(), opts);
}

function mockTest(opts, title) {
	return {
		title,
		metadata: metadata(opts)
	};
}

function titles(tests) {
	if (!tests) {
		tests = [];
	}

	return tests.map(test => test.title);
}

function removeEmptyProps(obj) {
	if (Array.isArray(obj) && obj.length === 0) {
		return null;
	}

	if (obj.constructor !== Object) {
		return obj;
	}

	let cleanObj = null;

	Object.keys(obj).forEach(key => {
		const value = removeEmptyProps(obj[key]);

		if (value) {
			if (!cleanObj) {
				cleanObj = {};
			}

			cleanObj[key] = value;
		}
	});

	return cleanObj;
}

function serialize(collection) {
	const serialized = {
		tests: {
			concurrent: titles(collection.tests.concurrent),
			serial: titles(collection.tests.serial)
		},
		hooks: {
			before: titles(collection.hooks.before),
			beforeEach: titles(collection.hooks.beforeEach),
			after: titles(collection.hooks.after),
			afterAlways: titles(collection.hooks.afterAlways),
			afterEach: titles(collection.hooks.afterEach),
			afterEachAlways: titles(collection.hooks.afterEachAlways)
		}
	};

	return removeEmptyProps(serialized);
}

test('throws if no type is supplied', t => {
	const collection = new TestCollection({});
	t.throws(() => {
		collection.add({
			title: 'someTitle',
			metadata: {}
		});
	}, {message: 'Test type must be specified'});
	t.end();
});

test('throws if you try to set a hook as exclusive', t => {
	const collection = new TestCollection({});
	t.throws(() => {
		collection.add(mockTest({
			type: 'beforeEach',
			exclusive: true
		}));
	}, {message: '"only" cannot be used with a beforeEach hook'});
	t.end();
});

test('throws if you try to set a before hook as always', t => {
	const collection = new TestCollection({});
	t.throws(() => {
		collection.add(mockTest({
			type: 'before',
			always: true
		}));
	}, {message: '"always" can only be used with after and afterEach hooks'});
	t.end();
});

test('throws if you try to set a test as always', t => {
	const collection = new TestCollection({});
	t.throws(() => {
		collection.add(mockTest({always: true}));
	}, {message: '"always" can only be used with after and afterEach hooks'});
	t.end();
});

test('hasExclusive is set when an exclusive test is added', t => {
	const collection = new TestCollection({});
	t.false(collection.hasExclusive);
	collection.add(mockTest({exclusive: true}, 'foo'));
	t.true(collection.hasExclusive);
	t.end();
});

test('adding a concurrent test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({}, 'foo'));
	t.strictDeepEqual(serialize(collection), {
		tests: {
			concurrent: ['foo']
		}
	});
	t.end();
});

test('adding a serial test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({serial: true}, 'bar'));
	t.strictDeepEqual(serialize(collection), {
		tests: {
			serial: ['bar']
		}
	});
	t.end();
});

test('adding a before test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({type: 'before'}, 'baz'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			before: ['baz']
		}
	});
	t.end();
});

test('adding a beforeEach test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({type: 'beforeEach'}, 'foo'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			beforeEach: ['foo']
		}
	});
	t.end();
});

test('adding a after test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({type: 'after'}, 'bar'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			after: ['bar']
		}
	});
	t.end();
});

test('adding a after.always test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({
		type: 'after',
		always: true
	}, 'bar'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			afterAlways: ['bar']
		}
	});
	t.end();
});

test('adding a afterEach test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({type: 'afterEach'}, 'baz'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			afterEach: ['baz']
		}
	});
	t.end();
});

test('adding a afterEach.always test', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({
		type: 'afterEach',
		always: true
	}, 'baz'));
	t.strictDeepEqual(serialize(collection), {
		hooks: {
			afterEachAlways: ['baz']
		}
	});
	t.end();
});

test('adding a bunch of different types', t => {
	const collection = new TestCollection({});
	collection.add(mockTest({}, 'a'));
	collection.add(mockTest({}, 'b'));
	collection.add(mockTest({serial: true}, 'c'));
	collection.add(mockTest({serial: true}, 'd'));
	collection.add(mockTest({type: 'before'}, 'e'));
	t.strictDeepEqual(serialize(collection), {
		tests: {
			concurrent: ['a', 'b'],
			serial: ['c', 'd']
		},
		hooks: {
			before: ['e']
		}
	});
	t.end();
});

test('foo', t => {
	const collection = new TestCollection({});
	const log = [];

	function logger(result) {
		t.is(result.passed, true);
		log.push(result.result.title);
	}

	function add(title, opts) {
		collection.add({
			title,
			metadata: metadata(opts),
			fn: a => a.pass()
		});
	}

	add('after1', {type: 'after'});
	add('after.always', {
		type: 'after',
		always: true
	});
	add('beforeEach1', {type: 'beforeEach'});
	add('before1', {type: 'before'});
	add('beforeEach2', {type: 'beforeEach'});
	add('afterEach1', {type: 'afterEach'});
	add('afterEach.always', {
		type: 'afterEach',
		always: true
	});
	add('test1', {});
	add('afterEach2', {type: 'afterEach'});
	add('test2', {});
	add('after2', {type: 'after'});
	add('before2', {type: 'before'});

	collection.on('test', logger);

	const passed = collection.build().run();
	t.is(passed, true);

	t.strictDeepEqual(log, [
		'before1',
		'before2',
		'beforeEach1 for test1',
		'beforeEach2 for test1',
		'test1',
		'afterEach1 for test1',
		'afterEach2 for test1',
		'afterEach.always for test1',
		'beforeEach1 for test2',
		'beforeEach2 for test2',
		'test2',
		'afterEach1 for test2',
		'afterEach2 for test2',
		'afterEach.always for test2',
		'after1',
		'after2',
		'after.always'
	]);

	t.end();
});
