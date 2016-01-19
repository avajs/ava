var test = require('tap').test;
var TestCollection = require('../lib/test-collection');
var Test = require('../lib/test');

test('requires new', function (t) {
	var withoutNew = TestCollection;
	t.throws(function () {
		withoutNew();
	});
	t.end();
});

test('add throws if no callback is supplied', function (t) {
	var collection = new TestCollection();
	t.throws(function () {
		collection.add({type: 'test'}, 'someTitle');
	}, {message: 'you must provide a callback'});
	t.end();
});

test('add will set the title', function (t) {
	var collection = new TestCollection();
	collection.add({type: 'test'}, 'foo', function () {});
	t.deepEqual(collection.serialize(), [
		{id: 0, title: 'foo', metadata: {type: 'test'}}
	]);
	t.end();
});

test('add will infer the title from the function name', function (t) {
	var collection = new TestCollection();
	collection.add({type: 'test'}, function bar() {});
	t.deepEqual(collection.serialize(), [
		{id: 0, title: 'bar', metadata: {type: 'test'}}
	]);
	t.end();
});

test('add will set title to "[anonymous]" if it is type:test', function (t) {
	var collection = new TestCollection();
	collection.add({type: 'test'}, function () {});
	t.deepEqual(collection.serialize(), [
		{id: 0, title: '[anonymous]', metadata: {type: 'test'}}
	]);
	t.end();
});

test('add will set the title===type for other types', function (t) {
	var collection = new TestCollection();
	collection.add({type: 'after'}, function () {});
	collection.add({type: 'before'}, function () {});
	t.deepEqual(collection.serialize(), [
		{id: 0, title: 'after', metadata: {type: 'after'}},
		{id: 1, title: 'before', metadata: {type: 'before'}}
	]);
	t.end();
});

test('testFor creates a list of tests', function (t) {
	var collection = new TestCollection();
	collection.add({type: 'beforeEach'}, function () {});
	collection.add({type: 'afterEach'}, function () {});
	collection.add({type: 'test'}, function foo() {});
	collection.add({type: 'test'}, function bar() {});

	t.deepEqual(collection.serialize(collection.testsFor(2)), [
		{id: 0, title: 'beforeEach for "foo"', metadata: {type: 'beforeEach'}},
		{id: 2, title: 'foo', metadata: {type: 'test'}},
		{id: 1, title: 'afterEach for "foo"', metadata: {type: 'afterEach'}}
	]);

	t.deepEqual(collection.serialize(collection.testsFor(3)), [
		{id: 0, title: 'beforeEach for "bar"', metadata: {type: 'beforeEach'}},
		{id: 3, title: 'bar', metadata: {type: 'test'}},
		{id: 1, title: 'afterEach for "bar"', metadata: {type: 'afterEach'}}
	]);

	collection.testsFor(2).concat(collection.testsFor(3)).forEach(function (test) {
		t.ok(test instanceof Test);
	});

	t.end();
});
