'use strict';
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var each = require('each-async');
var eachSerial = require('async-each-series');
var Test = require('./test');

/**
 * Initialize a new `Runner`
 *
 * @param {Object} opts
 * @api public
 */

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

inherits(Runner, EventEmitter);
module.exports = Runner;

/**
 * Add concurrent test to `Runner`
 *
 * @param {String} title
 * @param {Function} cb
 * @api public
 */

Runner.prototype.addTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.concurrent.push(new Test(title, cb));
};

/**
 * Add serial test to `Runner`
 *
 * @param {String} title
 * @param {Function} cb
 * @api public
 */

Runner.prototype.addSerialTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.serial.push(new Test(title, cb));
};

/**
 * Run concurrent tests
 *
 * @param {Function} cb
 * @api private
 */

Runner.prototype.concurrent = function (cb) {
	each(this.tests.concurrent, function (test, i, next) {
		test.run(function (err) {
			if (err) {
				this.stats.failCount++;
			}

			this.results.push({
				title: test.title,
				error: err
			});

			this.emit('test', err, test.title);
			next();
		}.bind(this));
	}.bind(this), cb);
};

/**
 * Run serial tests
 *
 * @param {Function} cb
 * @api private
 */

Runner.prototype.serial = function (cb) {
	eachSerial(this.tests.serial, function (test, next) {
		test.run(function (err) {
			if (err) {
				this.stats.failCount++;
			}

			this.results.push({
				title: test.title,
				error: err
			});

			this.emit('test', err, test.title);
			next();
		}.bind(this));
	}.bind(this), cb);
};

/**
 * Run the `Runner`
 *
 * @param {Function} cb
 * @api public
 */

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

/**
 * Handle completion
 *
 * @param {Function} cb
 * @api private
 */

Runner.prototype.end = function (cb) {
	this.stats.passCount = this.stats.testCount - this.stats.failCount;
	cb(this.stats, this.results);
};
