var test = require('tap').test;
var TestCollection = require('../lib/test-collection');
var objectAssign = require('object-assign');

function defaults() {
	return {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		callback: false
	};
}

function metadata(opts) {
	return objectAssign(defaults(), opts);
}

function mockTest(opts, title) {
	return {
		title: title,
		metadata: metadata(opts)
	};
}

function titles(tests) {
	return tests.map(function (test) {
		return test.title;
	});
}

function serialize(collection) {
	var ret = {};
	function addTitles(name, source) {
		if (source[name] && source[name].length) {
			ret[name] = titles(source[name]);
		}
	}
	addTitles('serial', collection);
	addTitles('concurrent', collection);
	addTitles('before', collection.tests);
	addTitles('beforeEach', collection.tests);
	addTitles('after', collection.tests);
	addTitles('afterEach', collection.tests);
	return ret;
}

test('requires new', function (t) {
	var withoutNew = TestCollection;
	t.throws(function () {
		withoutNew();
	});
	t.end();
});

test('throws if no type is supplied', function (t) {
	var collection = new TestCollection();
	t.throws(function () {
		collection.add({title: 'someTitle', metadata: {}});
	}, {message: 'test type must be specified'});
	t.end();
});

test('throws if you try to set a hook as exclusive', function (t) {
	var collection = new TestCollection();
	t.throws(function () {
		collection.add(mockTest({type: 'beforeEach', exclusive: true}));
	}, {message: 'you can\'t use only with a beforeEach test'});
	t.end();
});

test('hasExclusive is set when an exclusive test is added', function (t) {
	var collection = new TestCollection();
	t.false(collection.hasExclusive);
	collection.add(mockTest({exclusive: true}, 'foo'));
	t.true(collection.hasExclusive);
	t.end();
});

test('adding a concurrent test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({}, 'foo'));
	t.same(serialize(collection), {concurrent: ['foo']});
	t.end();
});

test('adding a serial test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({serial: true}, 'bar'));
	t.same(serialize(collection), {serial: ['bar']});
	t.end();
});

test('adding a before test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({type: 'before'}, 'baz'));
	t.same(serialize(collection), {before: ['baz']});
	t.end();
});

test('adding a beforeEach test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({type: 'beforeEach'}, 'foo'));
	t.same(serialize(collection), {beforeEach: ['foo']});
	t.end();
});

test('adding a after test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({type: 'after'}, 'bar'));
	t.same(serialize(collection), {after: ['bar']});
	t.end();
});

test('adding a afterEach test', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({type: 'afterEach'}, 'baz'));
	t.same(serialize(collection), {afterEach: ['baz']});
	t.end();
});

test('adding a bunch of different types', function (t) {
	var collection = new TestCollection();
	collection.add(mockTest({}, 'a'));
	collection.add(mockTest({}, 'b'));
	collection.add(mockTest({serial: true}, 'c'));
	collection.add(mockTest({serial: true}, 'd'));
	collection.add(mockTest({type: 'before'}, 'e'));
	t.same(serialize(collection), {
		concurrent: ['a', 'b'],
		serial: ['c', 'd'],
		before: ['e']
	});
	t.end();
});

test('foo', function (t) {
	var collection = new TestCollection();

	var log = [];

	function logger(a) {
		log.push(a.title);
	}

	function add(title, opts) {
		collection.add({
			title: title,
			metadata: metadata(opts),
			fn: logger
		});
	}

	add('after1', {type: 'after'});
	add('beforeEach1', {type: 'beforeEach'});
	add('before1', {type: 'before'});
	add('beforeEach2', {type: 'beforeEach'});
	add('afterEach1', {type: 'afterEach'});
	add('test1', {});
	add('afterEach2', {type: 'afterEach'});
	add('test2', {});
	add('after2', {type: 'after'});
	add('before2', {type: 'before'});

	var result = collection.buildPhases().run();

	t.is(result.passed, true);

	t.same(log, [
		'before1',
		'before2',
		'beforeEach1 for test1',
		'beforeEach2 for test1',
		'test1',
		'afterEach1 for test1',
		'afterEach2 for test1',
		'beforeEach1 for test2',
		'beforeEach2 for test2',
		'test2',
		'afterEach1 for test2',
		'afterEach2 for test2',
		'after1',
		'after2'
	]);

	t.end();
});
