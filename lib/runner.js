'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var hasFlag = require('has-flag');
var Test = require('./test');
var send = require('./send');
var objectAssign = require('object-assign');

function noop() {}

function each(items, fn, context) {
	return Promise.all(items.map(fn, context));
}

function eachSeries(items, fn, context) {
	return Promise.each(items, fn.bind(context));
}

function Runner(opts) {
	if (!(this instanceof Runner)) {
		return new Runner(opts);
	}

	EventEmitter.call(this);

	this.results = [];

	this.tests = [];
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

Runner.prototype.addTest = function (title, cb, opts) {
	var test = new Test(title, cb);

	objectAssign(test, {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false
	}, opts);

	this.tests.push(test);
};

function Hook(type, title, fn) {
	if (!(this instanceof Hook)) {
		return new Hook(type, title, fn);
	}

	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	this.type = type;
	this.title = title;
	this.fn = fn;
}

Hook.prototype.test = function (testTitle) {
	var title = this.title || (this.type + ' for "' + testTitle + '"');
	var test = new Test(title, this.fn);
	test.type = this.type;
	return test;
};

Runner.prototype.addSerialTest = function (title, fn) {
	this.addTest(title, fn, {serial: true});
};

Runner.prototype.addBeforeHook = function (title, fn) {
	this.addTest(title, fn, {type: 'before'});
};

Runner.prototype.addAfterHook = function (title, fn) {
	this.addTest(title, fn, {type: 'after'});
};

Runner.prototype.addBeforeEachHook = function (title, fn) {
	this.tests.push(new Hook('beforeEach', title, fn));
};

Runner.prototype.addAfterEachHook = function (title, fn) {
	this.tests.push(new Hook('afterEach', title, fn));
};

Runner.prototype.addSkippedTest = function (title, fn) {
	this.addTest(title, fn, {skipped: true});
};

Runner.prototype.addOnlyTest = function (title, fn) {
	this.addTest(title, fn, {exclusive: true});
};

Runner.prototype._runTestWithHooks = function (test) {
	if (test.skip) {
		return this._addTestResult(test);
	}

	function hookToTest(hook) {
		return hook.test(test.title);
	}

	var tests = this.select({type: 'beforeEach'}).map(hookToTest);
	tests.push(test);
	tests.push.apply(tests, this.select({type: 'afterEach'}).map(hookToTest));

	var context = {};

	return eachSeries(tests, function (test) {
		Object.defineProperty(test, 'context', {
			get: function () {
				return context;
			},
			set: function (val) {
				context = val;
			}
		});

		return this._runTest(test);
	}, this).catch(noop);
};

Runner.prototype._runTest = function (test) {
	var self = this;

	// add test result regardless of state
	// but on error, don't execute next tests
	return test.run().finally(function () {
		self._addTestResult(test);
	});
};

Runner.prototype.concurrent = function (tests) {
	if (hasFlag('serial')) {
		return this.serial(tests);
	}

	return each(tests, this._runTestWithHooks, this);
};

Runner.prototype.serial = function (tests) {
	return eachSeries(tests, this._runTestWithHooks, this);
};

Runner.prototype._addTestResult = function (test) {
	if (test.assertError) {
		this.stats.failCount++;
	}

	var props = {
		duration: test.duration,
		title: test.title,
		error: test.assertError,
		type: test.type,
		skip: test.skip
	};

	this.results.push(props);
	this.emit('test', props);
};

Runner.prototype.run = function () {
	var self = this;
	var hasExclusive = Boolean(this.select({exclusive: true, skipped: false, type: 'test'}).length);
	var serial = this.select({exclusive: hasExclusive, skipped: false, serial: true, type: 'test'});
	var concurrent = this.select({exclusive: hasExclusive, skipped: false, serial: false, type: 'test'});

	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		testCount: serial.length + concurrent.length
	};

	// Runner is executed directly in tests, in that case process.send() == undefined
	if (process.send) {
		send('stats', stats);
	}

	return eachSeries(this.select({type: 'before'}), this._runTest, this)
		.catch(noop)
		.then(function () {
			if (stats.failCount > 0) {
				return Promise.reject();
			}
		})
		.then(function () {
			return self.serial(serial);
		})
		.then(function () {
			return self.concurrent(concurrent);
		})
		.then(function () {
			return eachSeries(self.select({type: 'after'}), self._runTest, self);
		})
		.catch(noop)
		.then(function () {
			stats.passCount = stats.testCount - stats.failCount;
		});
};

Runner.prototype.select = function (filter) {
	function filterFn(test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test[key];
		});
	}
	return this.tests.filter(filterFn);
};
