'use strict';
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var eachAsync = require('each-async');
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
	this.tests = [];
}

inherits(Runner, EventEmitter);

/**
 * Add test to `Runner`
 *
 * @param {String} title
 * @param {Function} cb
 * @api public
 */

Runner.prototype.addTest = function (title, cb) {
	this.stats.testCount++;
	this.tests.push(new Test(title, cb));
};

/**
 * Run the `Runner`
 *
 * @param {Function} cb
 * @api public
 */

Runner.prototype.run = function (cb) {
	eachAsync(this.tests, function (test, i, next) {
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
	}.bind(this), function () {
		this.stats.passCount = this.stats.testCount - this.stats.failCount;
		cb(this.stats, this.results);
	}.bind(this));
};

module.exports = Runner;
