'use strict';
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var eachAsync = require('each-async');
var Test = require('./test');

/**
 * Initialize a new `Runner`
 *
 * @param {String} title
 * @param {Function} fn
 * @api public
 */

function Runner(opts) {
	if (!(this instanceof Runner)) {
		return new Runner(opts);
	}

	EventEmitter.call(this);

	this._tests = [];
	this._results = [];
	this._firstError = null;
	this._failCount = 0;
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
	this._tests.push(new Test(title, cb));
};

/**
 * Run the `Runner`
 *
 * @param {Function} cb
 * @api public
 */

Runner.prototype.run = function (cb) {
	var self = this;

	eachAsync(this._tests, function (test, i, next) {
		test.run(function (err) {
			if (err) {
				if (!self._firstError) {
					self._firstError = err;
				}

				self._failCount++;
			}

			self._results.push({
				title: test.title,
				error: err
			});

			self.emit('test', err, test.title);
			next();
		});
	}, function () {
		var testCount = self._tests.length;
		var failCount = self._failCount;
		var passCount = testCount - failCount;

		cb({
			testCount: testCount,
			failCount: failCount,
			passCount: passCount
		}, self._results);
	});
};

module.exports = Runner;
