'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var each = require('each-async');
var eachSerial = require('async-each-series');
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

Runner.prototype.concurrent = function (cb) {
	each(this.tests.concurrent, function (test, i, next) {
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
	}.bind(this), cb);
};

Runner.prototype.serial = function (cb) {
	eachSerial(this.tests.serial, function (test, next) {
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
	}.bind(this), cb);
};

Runner.prototype.runBeforeHooks = function (cb) {
	eachSerial(this.tests.before, function (test, next) {
		test.run(function (err) {
			if (err) {
				this.stats.failCount++;
			}

			next();
		}.bind(this));
	}.bind(this), cb);
};

Runner.prototype.runAfterHooks = function (cb) {
	eachSerial(this.tests.after, function (test, next) {
		test.run(function (err) {
			if (err) {
				this.stats.failCount++;
			}

			next();
		}.bind(this));
	}.bind(this), cb);
};

Runner.prototype.run = function (cb) {
	// TODO: refactor this bullshit
	this.runBeforeHooks(function () {
		this.serial(function () {
			this.concurrent(function () {
				this.runAfterHooks(function () {
					this.end(cb);
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this));
};

Runner.prototype.end = function (cb) {
	this.stats.passCount = this.stats.testCount - this.stats.failCount;
	cb(this.stats, this.results);
};
