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

Runner.prototype.run = function (cb) {
	var concurrent = this.tests.concurrent;
	var serial = this.tests.serial;

	if (serial.length > 0 && concurrent.length === 0) {
		this.serial(this.end.bind(this, cb));
		return;
	}

	if (serial.length === 0 && concurrent.length > 0) {
		this.concurrent(this.end.bind(this, cb));
		return;
	}

	if (serial.length > 0 && concurrent.length > 0) {
		this.serial(this.concurrent.bind(this, this.end.bind(this, cb)));
		return;
	}

	this.end(cb);
};

Runner.prototype.end = function (cb) {
	this.stats.passCount = this.stats.testCount - this.stats.failCount;
	cb(this.stats, this.results);
};
