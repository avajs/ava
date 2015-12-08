'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('../node_modules/util');
var Promise = require('../node_modules/bluebird');
var hasFlag = require('../node_modules/has-flag');
var Test = require('./test');
var send = require('./send');

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
		only: [],
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
	var test = new Test(title, cb);
	test.type = 'hook';

	this.tests.before.push(test);
};

Runner.prototype.addAfterHook = function (title, cb) {
	var test = new Test(title, cb);
	test.type = 'hook';

	this.tests.after.push(test);
};

Runner.prototype.addBeforeEachHook = function (title, cb) {
	if (!cb) {
		cb = title;
		title = undefined;
	}

	this.tests.beforeEach.push({
		title: title,
		fn: cb
	});
};

Runner.prototype.addAfterEachHook = function (title, cb) {
	if (!cb) {
		cb = title;
		title = undefined;
	}

	this.tests.afterEach.push({
		title: title,
		fn: cb
	});
};

Runner.prototype.addSkippedTest = function (title, cb) {
	var test = new Test(title, cb);
	test.skip = true;

	this.tests.concurrent.push(test);
};

Runner.prototype.addOnlyTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.only.push(new Test(title, cb));
};

Runner.prototype._runTestWithHooks = function (test) {
	if (test.skip) {
		this._addTestResult(test);
		return Promise.resolve();
	}

	var beforeHooks = this.tests.beforeEach.map(function (hook) {
		var title = hook.title || 'beforeEach for "' + test.title + '"';
		hook = new Test(title, hook.fn);
		hook.type = 'eachHook';

		return hook;
	});

	var afterHooks = this.tests.afterEach.map(function (hook) {
		var title = hook.title || 'afterEach for "' + test.title + '"';
		hook = new Test(title, hook.fn);
		hook.type = 'eachHook';

		return hook;
	});

	var tests = [];

	tests.push.apply(tests, beforeHooks);
	tests.push(test);
	tests.push.apply(tests, afterHooks);

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
	}.bind(this)).catch(noop);
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
	if (hasFlag('serial')) {
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
	var tests = this.tests;
	var stats = this.stats;

	// Runner is executed directly in tests, in that case process.send() == undefined
	if (process.send) {
		send('stats', stats);
	}

	return eachSeries(tests.before, this._runTest.bind(this))
		.catch(noop)
		.then(function () {
			if (stats.failCount > 0) {
				return Promise.reject();
			}
		})
		.then(function () {
			return self.concurrent(tests.only);
		})
		.then(function () {
			return tests.only.length ? [] : self.serial(tests.serial);
		})
		.then(function () {
			return tests.only.length ? [] : self.concurrent(tests.concurrent);
		})
		.then(function () {
			return eachSeries(tests.after, self._runTest.bind(self));
		})
		.catch(noop)
		.then(function () {
			stats.testCount = tests.only.length ? tests.only.length : stats.testCount;
			stats.passCount = stats.testCount - stats.failCount;
		});
};
