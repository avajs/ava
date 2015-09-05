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

Runner.prototype.concurrent = function (tests, cb) {
	each(tests, function (test, i, next) {
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

Runner.prototype.serial = function (tests, cb) {
	eachSerial(tests, function (test, next) {
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

Runner.prototype.run = function (cb) {
	var concurrent = this.tests.concurrent;
	var serial = this.tests.serial;
	var before = this.tests.before;
	var after = this.tests.after;

	// TODO: refactor this bullshit
	this.serial(before, function () {
		if (this.stats.failCount > 0) {
			return this.end(cb);
		}

		this.serial(serial, function () {
			this.concurrent(concurrent, function () {
				this.serial(after, function () {
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
