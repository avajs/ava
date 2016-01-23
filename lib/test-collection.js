'use strict';
module.exports = TestCollection;

function TestCollection() {
	if (!(this instanceof TestCollection)) {
		throw new Error('must use `new TestCollection()`');
	}
	this.serial = [];
	this.concurrent = [];
	this.tests = {
		before: [],
		beforeEach: [],
		after: [],
		afterEach: []
	};
	this.hasExclusive = false;
}

TestCollection.prototype.add = function (test) {
	var metadata = test.metadata;
	var type = metadata.type;
	if (!type) {
		throw new Error('test type must be specified');
	}
	if (type === 'test') {
		if (metadata.exclusive) {
			this.hasExclusive = true;
		}
		(metadata.serial ? this.serial : this.concurrent).push(test);
		return;
	}
	if (metadata.exclusive) {
		throw new Error('you can\'t use only with a ' + type + ' test');
	}
	this.tests[type].push(test);
};

var fnName = require('fn-name');
var Sequence = require('./sequence');
var Concurrent = require('./concurrent');
var Test = require('./test');

function computeTitle(entry) {
	entry.title = entry.title || fnName(entry.fn);

	// workaround for Babel giving anonymous functions a name
	if (entry.title === 'callee$0$0') {
		entry.title = null;
	}

	if (!entry.title) {
		if (entry.metadata.type === 'test') {
			entry.title = '[anonymous]';
		} else {
			entry.title = entry.metadata.type;
		}
	}
}

function buildHooks(hookArray, title, contextRef) {
	return hookArray.map(function (hook) {
		var test = new Test(hook.title + ' for ' + title, hook.fn, contextRef);
		test.metadata = hook.metadata;
		return test;
	});
}

function buildTest(entry, ctxRef) {
	var test = new Test(entry.title, entry.fn, ctxRef);
	test.metadata = entry.metadata;
	return test;
}

function buildTestWithHooks(entry, beforeEach, afterEach) {
	var contextRef = {context: {}};
	var arr = buildHooks(beforeEach, entry.title, contextRef);
	arr.push(buildTest(entry, contextRef));
	return arr.concat(buildHooks(afterEach, entry.title, contextRef));
}

TestCollection.prototype.buildPhases = function () {
	[
		this.serial,
		this.concurrent,
		this.tests.before,
		this.tests.beforeEach,
		this.tests.after,
		this.tests.afterEach
	].forEach(function (arr) {
		arr.forEach(computeTitle);
	});

	return new Sequence(
		[
			new Sequence(this.tests.before.map(function (entry) {
				return buildTest(entry);
			})),
			new Sequence([
				new Sequence(this.serial.map(function (entry) {
					return new Sequence(buildTestWithHooks(entry, this.tests.beforeEach, this.tests.afterEach), true);
				}, this), false),
				new Concurrent(this.concurrent.map(function (entry) {
					return new Sequence(buildTestWithHooks(entry, this.tests.beforeEach, this.tests.afterEach), true);
				}, this), false)
			], false),
			new Sequence(this.tests.after.map(function (entry) {
				return buildTest(entry);
			}))
		],
		true
	);
};
