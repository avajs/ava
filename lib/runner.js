'use strict';
var Promise = require('pinkie-promise');
var promisify = require('pify');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var each = promisify(require('each-async'), Promise);
var eachSerial = promisify(require('async-each-series'), Promise);
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
	return each(tests, function (test, i, next) {
		test.run(function (err, duration) {
			if (err) {
				this.stats.failCount++;
			}

			this.results.push({
				duration: duration,
				title: test.title,
				error: err
			});

			this.emit('test', err, test.title, duration);
			next();
		}.bind(this));
	}.bind(this));
};

Runner.prototype.serial = function (tests) {
	return eachSerial(tests, function (test, next) {
		test.run(function (err, duration) {
			if (err) {
				this.stats.failCount++;
			}

			this.results.push({
				duration: duration,
				title: test.title,
				error: err
			});

			this.emit('test', err, test.title, duration);
			next();
		}.bind(this));
	}.bind(this));
};

Runner.prototype.run = function (cb) {
	var concurrent = this.tests.concurrent;
	var serial = this.tests.serial;
	var before = this.tests.before;
	var after = this.tests.after;

	var self = this;

	this.serial(before)
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
			self.end(cb);
		});
};

Runner.prototype.end = function (cb) {
	this.stats.passCount = this.stats.testCount - this.stats.failCount;
	cb(this.stats, this.results);
};
