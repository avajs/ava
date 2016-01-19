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

	// workaround for Babel giving anonymous functions a name
	if (title === 'callee$0$0') {
		title = '[anonymous]';
	}

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
		if (Array.isArray(testEntry)) {
			return this.serialize(testEntry);
		}
		return {
			metadata: testEntry.metadata,
			title: testEntry.title,
			id: testEntry.id
		};
	}, this);
};

TestCollection.prototype.getEntry = function (entryOrId) {
	if (typeof entryOrId === 'number') {
		entryOrId = this.tests[entryOrId];
	}
	return entryOrId;
};

TestCollection.prototype.testsFor = function (testEntry) {
	return this.testEntriesFor(testEntry).map(makeTest);
};

TestCollection.prototype.testEntriesFor = function (testEntry) {
	testEntry = this.getEntry(testEntry);

	var type = testEntry.metadata.type;
	assert.is(type, 'test', 'not a valid testEntry');

	function hookToTest(hookEntry) {
		return {
			id: hookEntry.id,
			metadata: hookEntry.metadata,
			title: hookEntry.title + ' for "' + testEntry.title + '"',
			fn: hookEntry.fn
		};
	}

	var tests = this.select({type: 'beforeEach'}).map(hookToTest);
	tests.push(testEntry);
	tests.push.apply(tests, this.select({type: 'afterEach'}).map(hookToTest));
	return tests;
};

TestCollection.prototype.buildPhases = function () {
	var hasExclusive = this.select({
		exclusive: true,
		skipped: false,
		type: 'test'
	}).length > 0;

	var serial = this.select({
		exclusive: hasExclusive,
		serial: true,
		type: 'test'
	});

	var concurrent = this.select({
		exclusive: hasExclusive,
		serial: false,
		type: 'test'
	});

	var ret = this.select({type: 'before'}).map(function (testEntry) {
		return [[makeTest(testEntry)]];
	});
	ret.push.apply(ret, serial.map(function (testEntry) {
		return [this.testsFor(testEntry)];
	}, this));
	ret.push(concurrent.map(function (testEntry) {
		return this.testsFor(testEntry);
	}, this));
	ret.push.apply(ret, this.select({type: 'after'}).map(function (testEntry) {
		return [[makeTest(testEntry)]];
	}));

	return ret;
};

TestCollection.prototype.select = function (filter) {
	return this.tests.filter(function (test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test.metadata[key];
		});
	});
};

function makeTest(testEntry) {
	var test = new Test(testEntry.title, testEntry.fn);
	test.metadata = testEntry.metadata;
	test.id = testEntry.id;
	return test;
}

TestCollection.makeTest = makeTest;
