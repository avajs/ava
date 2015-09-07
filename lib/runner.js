'use strict';
var Promise = require('bluebird');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Test = require('./test');

function Runner(opts) {
	if (!(this instanceof Runner)) {
		return new Runner(opts);
	}

	EventEmitter.call(this);

	this.results = [];
	this.stats = {};
	this.stats.failCount = 0;
	this.stats.testCount = 0;
	this.tests = {};
	this.tests.concurrent = [];
	this.tests.serial = [];
	this.tests.before = [];
	this.tests.after = [];
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

Runner.prototype.concurrent = function (tests) {
	// run all tests
	tests = tests.map(function (test) {
		// in case of error, don't reject a promise
		return test.run().catch(function () {
			return;
		}).then(function () {
			this._addTestResult(test);
		}.bind(this));
	}, this);

	return Promise.all(tests);
};

Runner.prototype.serial = function (tests) {
	return Promise.resolve(tests).each(function (test) {
		return test.run()
			.catch(function () {
				return;
			})
			.then(function () {
				this._addTestResult(test);
			}.bind(this));
	}.bind(this));
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
	var concurrent = this.tests.concurrent;
	var serial = this.tests.serial;
	var before = this.tests.before;
	var after = this.tests.after;

	var self = this;

	return this.serial(before)
		.then(function () {
			if (self.stats.failCount > 0) {
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
			return self.serial(after);
		})
		.catch(function () {
			return;
		})
		.then(function () {
			self.stats.passCount = self.stats.testCount - self.stats.failCount;
		});
};
