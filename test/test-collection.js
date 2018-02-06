'use strict';
require('../lib/worker-options').set({});

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

test('skips before and after hooks when all tests are skipped', t => {
	t.plan(5);

	const collection = new TestCollection({});
	collection.add({
		metadata: metadata({type: 'before'}),
		fn: a => a.fail()
	});
	collection.add({
		metadata: metadata({type: 'after'}),
		fn: a => a.fail()
	});
	collection.add({
		title: 'some serial test',
		metadata: metadata({skipped: true, serial: true}),
		fn: a => a.fail()
	});
	collection.add({
		title: 'some concurrent test',
		metadata: metadata({skipped: true}),
		fn: a => a.fail()
	});

	const log = [];
	collection.on('test', result => {
		t.is(result.result.metadata.skipped, true);
		t.is(result.result.metadata.type, 'test');
		log.push(result.result.title);
	});

	collection.build().run();

	t.strictDeepEqual(log, [
		'some serial test',
		'some concurrent test'
	]);

	t.end();
});

test('runs after.always hook, even if all tests are skipped', t => {
	t.plan(6);

	const collection = new TestCollection({});
	collection.add({
		title: 'some serial test',
		metadata: metadata({skipped: true, serial: true}),
		fn: a => a.fail()
	});
	collection.add({
		title: 'some concurrent test',
		metadata: metadata({skipped: true}),
		fn: a => a.fail()
	});
	collection.add({
		title: 'after always',
		metadata: metadata({type: 'after', always: true}),
		fn: a => a.pass()
	});

	const log = [];
	collection.on('test', result => {
		if (result.result.metadata.type === 'after') {
			t.is(result.result.metadata.skipped, false);
		} else {
			t.is(result.result.metadata.skipped, true);
			t.is(result.result.metadata.type, 'test');
		}
		log.push(result.result.title);
	});

	collection.build().run();

	t.strictDeepEqual(log, [
		'some serial test',
		'some concurrent test',
		'after always'
	]);

	t.end();
});

test('skips beforeEach and afterEach hooks when test is skipped', t => {
	t.plan(3);

	const collection = new TestCollection({});
	collection.add({
		metadata: metadata({type: 'beforeEach'}),
		fn: a => a.fail()
	});
	collection.add({
		metadata: metadata({type: 'afterEach'}),
		fn: a => a.fail()
	});
	collection.add({
		title: 'some test',
		metadata: metadata({skipped: true}),
		fn: a => a.fail()
	});

	const log = [];
	collection.on('test', result => {
		t.is(result.result.metadata.skipped, true);
		t.is(result.result.metadata.type, 'test');
		log.push(result.result.title);
	});

	collection.build().run();

	t.strictDeepEqual(log, [
		'some test'
	]);

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
