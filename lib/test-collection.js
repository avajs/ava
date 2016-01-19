'use strict';
var assert = require('./assert');
var fnName = require('fn-name');
var Test = require('./test');

module.exports = TestCollection;

function TestCollection() {
	if (!(this instanceof TestCollection)) {
		throw new Error('TestCollection must be called with new');
	}
	this.tests = [];
}

TestCollection.prototype.add = function (metadata, title, fn) {
	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	assert.is(typeof fn, 'function', 'you must provide a callback');

	title = title || fnName(fn) || (metadata.type === 'test' ? '[anonymous]' : metadata.type);

	var testEntry = {
		metadata: metadata,
		title: title,
		fn: fn,
		id: this.tests.length
	};

	this.tests.push(testEntry);

	return testEntry;
};

TestCollection.prototype.serialize = function (tests) {
	return (tests || this.tests).map(function (testEntry) {
		return {
			metadata: testEntry.metadata,
			title: testEntry.title,
			id: testEntry.id
		};
	});
};

TestCollection.prototype.getEntry = function (entryOrId) {
	if (typeof entryOrId === 'number') {
		entryOrId = this.tests[entryOrId];
	}
	return entryOrId;
};

TestCollection.prototype.testsFor = function (testEntry) {
	testEntry = this.getEntry(testEntry);
	var type = testEntry.metadata.type;
	/*
	if (type === 'before' || type === 'after') {
		return [makeTest(testEntry.title, testEntry)];
	}
	*/
	assert.is(type, 'test', 'not a valid testEntry');

	function hookToTest(hookEntry) {
		return makeTest(hookEntry.title + ' for "' + testEntry.title + '"', hookEntry);
	}

	var tests = this.select({type: 'beforeEach'}).map(hookToTest);
	tests.push(makeTest(testEntry.title, testEntry));
	tests.push.apply(tests, this.select({type: 'afterEach'}).map(hookToTest));
	return tests;
};

TestCollection.prototype.select = function (filter) {
	return this.tests.filter(function (test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test.metadata[key];
		});
	});
};

function makeTest(title, testEntry) {
	var test = new Test(title, testEntry.fn);
	test.metadata = testEntry.metadata;
	test.id = testEntry.id;
	return test;
}

TestCollection.makeTest = function (entry) {
	return makeTest(entry.title, entry);
};
