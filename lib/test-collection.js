'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fnName = require('fn-name');
var Concurrent = require('./concurrent');
var Sequence = require('./sequence');
var Test = require('./test');

module.exports = TestCollection;

function TestCollection() {
	if (!(this instanceof TestCollection)) {
		throw new TypeError('Class constructor TestCollection cannot be invoked without \'new\'');
	}

	EventEmitter.call(this);

	this.hasExclusive = false;
	this.tests = {
		concurrent: [],
		serial: []
	};

	this.hooks = {
		before: [],
		beforeEach: [],
		after: [],
		afterAlways: [],
		afterEach: [],
		afterEachAlways: []
	};

	this._emitTestResult = this._emitTestResult.bind(this);
}

util.inherits(TestCollection, EventEmitter);

TestCollection.prototype.add = function (test) {
	var metadata = test.metadata;
	var type = metadata.type;

	if (!type) {
		throw new Error('Test type must be specified');
	}

	if (!test.title && test.fn) {
		test.title = fnName(test.fn);
	}

	// workaround for Babel giving anonymous functions a name
	if (test.title === 'callee$0$0') {
		test.title = null;
	}

	if (!test.title) {
		if (type === 'test') {
			test.title = '[anonymous]';
		} else {
			test.title = type;
		}
	}

	if (metadata.always && type !== 'after' && type !== 'afterEach') {
		throw new Error('"always" can only be used with after and afterEach hooks');
	}

	// add a hook
	if (type !== 'test') {
		if (metadata.exclusive) {
			throw new Error('"only" cannot be used with a ' + type + ' hook');
		}

		this.hooks[type + (metadata.always ? 'Always' : '')].push(test);
		return;
	}

	// add .only() tests if .only() was used previously
	if (this.hasExclusive && !metadata.exclusive) {
		return;
	}

	if (metadata.exclusive && !this.hasExclusive) {
		this.tests.concurrent = [];
		this.tests.serial = [];
		this.hasExclusive = true;
	}

	if (metadata.serial) {
		this.tests.serial.push(test);
	} else {
		this.tests.concurrent.push(test);
	}
};

TestCollection.prototype._skippedTest = function (test) {
	var self = this;

	return {
		run: function () {
			var result = {
				passed: true,
				result: test
			};

			self._emitTestResult(result);

			return result;
		}
	};
};

TestCollection.prototype._emitTestResult = function (test) {
	this.emit('test', test);
};

TestCollection.prototype._buildHooks = function (hooks, testTitle, context) {
	return hooks.map(function (hook) {
		var test = this._buildHook(hook, testTitle, context);

		if (hook.metadata.skipped || hook.metadata.todo) {
			return this._skippedTest(test);
		}

		return test;
	}, this);
};

TestCollection.prototype._buildHook = function (hook, testTitle, context) {
	var title = hook.title;

	if (testTitle) {
		title += ' for ' + testTitle;
	}

	if (!context) {
		context = null;
	}

	var test = new Test(title, hook.fn, context, this._emitTestResult);
	test.metadata = hook.metadata;

	return test;
};

TestCollection.prototype._buildTest = function (test, context) {
	if (!context) {
		context = null;
	}

	var metadata = test.metadata;

	test = new Test(test.title, test.fn, context, this._emitTestResult);
	test.metadata = metadata;

	return test;
};

TestCollection.prototype._buildTestWithHooks = function (test) {
	if (test.metadata.skipped) {
		return new Sequence([this._skippedTest(this._buildTest(test))], true);
	}

	var context = {context: {}};

	var beforeHooks = this._buildHooks(this.hooks.beforeEach, test.title, context);
	var afterHooks = this._buildHooks(this.hooks.afterEach, test.title, context);

	var sequence = new Sequence([].concat(beforeHooks, this._buildTest(test, context), afterHooks), true);
	if (this.hooks.afterEachAlways.length !== 0) {
		var afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterEachAlways, test.title, context));
		sequence = new Sequence([sequence, afterAlwaysHooks], false);
	}
	return sequence;
};

TestCollection.prototype._buildTests = function (tests) {
	return tests.map(function (test) {
		return this._buildTestWithHooks(test);
	}, this);
};

TestCollection.prototype.build = function (bail) {
	var beforeHooks = new Sequence(this._buildHooks(this.hooks.before));
	var afterHooks = new Sequence(this._buildHooks(this.hooks.after));

	var serialTests = new Sequence(this._buildTests(this.tests.serial), bail);
	var concurrentTests = new Concurrent(this._buildTests(this.tests.concurrent), bail);
	var allTests = new Sequence([serialTests, concurrentTests]);

	var finalTests = new Sequence([beforeHooks, allTests, afterHooks], true);
	if (this.hooks.afterAlways.length !== 0) {
		var afterAlwaysHooks = new Sequence(this._buildHooks(this.hooks.afterAlways));
		finalTests = new Sequence([finalTests, afterAlwaysHooks], false);
	}
	return finalTests;
};
