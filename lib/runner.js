'use strict';
var util = require('util');
var flatten = require('arr-flatten');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var Test = require('./test');

function Runner(opts) {
	if (!(this instanceof Runner)) {
		return new Runner(opts);
	}

	EventEmitter.call(this);

	this.results = [];

	this.stats = {
		failCount: 0,
		testCount: 0
	};

	this.tests = {
		concurrent: [],
		serial: [],
		before: [],
		after: [],
		beforeEach: [],
		afterEach: []
	};
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

Runner.prototype.addTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.concurrent.push(new Test(title, cb));
};

Runner.prototype.addSerialTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.serial.push(new Test(title, cb));
};

Runner.prototype.addBeforeHook = function (title, cb) {
	this.tests.before.push(new Test(title, cb));
};

Runner.prototype.addAfterHook = function (title, cb) {
	this.tests.after.push(new Test(title, cb));
};

Runner.prototype.addBeforeEachHook = function (title, cb) {
	this.tests.beforeEach.push({
		title: title,
		fn: cb
	});
};

Runner.prototype.addAfterEachHook = function (title, cb) {
	this.tests.afterEach.push({
		title: title,
		fn: cb
	});
};

Runner.prototype._wrapTestWithHooks = function (test) {
	var self = this;

	var beforeHooks = self.tests.beforeEach.map(function (hook) {
		return new Test(hook.title, hook.fn);
	});

	var afterHooks = self.tests.afterEach.map(function (hook) {
		return new Test(hook.title, hook.fn);
	});

	var tests = [];

	tests.push.apply(tests, beforeHooks);
	tests.push(test);
	tests.push.apply(tests, afterHooks);

	return tests;
};

Runner.prototype.concurrent = function (tests) {
	var self = this;

	tests = tests.map(function (test) {
		return self._wrapTestWithHooks(test);
	});

	tests = flatten(tests);

	// run all tests
	return Promise.all(tests.map(function (test) {
		return test.run()
			.catch(function () {
				// in case of error, don't reject a promise
				return;
			})
			.then(function () {
				self._addTestResult(test);
			});
	}));
};

Runner.prototype.serial = function (tests) {
	var self = this;

	tests = tests.map(function (test) {
		return self._wrapTestWithHooks(test);
	});

	tests = flatten(tests);

	return Promise.resolve(tests).each(function (test) {
		return test.run()
			.catch(function () {
				return;
			})
			.then(function () {
				self._addTestResult(test);
			});
	});
};

Runner.prototype._addTestResult = function (test) {
	if (test.assertError) {
		this.stats.failCount++;
	}

	this.results.push({
		duration: test.duration,
		title: test.title,
		error: test.assertError
	});

	this.emit('test', test.assertError, test.title, test.duration);
};

Runner.prototype.run = function () {
	var self = this;
	var tests = this.tests;
	var stats = this.stats;

	return this.serial(tests.before)
		.then(function () {
			if (stats.failCount > 0) {
				return Promise.reject();
			}
		})
		.then(function () {
			return self.serial(tests.serial);
		})
		.then(function () {
			return self.concurrent(tests.concurrent);
		})
		.then(function () {
			return self.serial(tests.after);
		})
		.catch(function () {
			return;
		})
		.then(function () {
			stats.passCount = stats.testCount - stats.failCount;
		});
};
