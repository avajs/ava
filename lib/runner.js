'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var Test = require('./test');

var isSerial = process.argv.indexOf('--serial') !== -1;

function noop() {}

function each(items, fn) {
	return Promise.all(items.map(fn));
}

function eachSeries(items, fn) {
	return Promise.resolve(items).each(fn);
}

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

Runner.prototype._runTestWithHooks = function (test) {
	var beforeHooks = this.tests.beforeEach.map(function (hook) {
		return new Test(hook.title, hook.fn);
	});

	var afterHooks = this.tests.afterEach.map(function (hook) {
		return new Test(hook.title, hook.fn);
	});

	var tests = [];

	tests.push.apply(tests, beforeHooks);
	tests.push(test);
	tests.push.apply(tests, afterHooks);

	return eachSeries(tests, this._runTest.bind(this)).catch(noop);
};

Runner.prototype._runTest = function (test) {
	// add test result regardless of state
	// but on error, don't execute next tests
	return test.run()
		.finally(function () {
			this._addTestResult(test);
		}.bind(this));
};

Runner.prototype.concurrent = function (tests) {
	if (isSerial) {
		return this.serial(tests);
	}

	return each(tests, this._runTestWithHooks.bind(this));
};

Runner.prototype.serial = function (tests) {
	return eachSeries(tests, this._runTestWithHooks.bind(this));
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

	return eachSeries(tests.before, this._runTest.bind(this))
		.catch(noop)
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
			return eachSeries(tests.after, self._runTest.bind(self));
		})
		.catch(noop)
		.then(function () {
			stats.passCount = stats.testCount - stats.failCount;
		});
};
