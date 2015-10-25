'use strict';
var isGenerator = require('is-generator').fn;
var Promise = require('bluebird');
var setImmediate = require('set-immediate-shim');
var fnName = require('fn-name');
var co = require('co');
var assert = require('./assert');

var TIMEOUT_MAX_VALUE = 2147483647;

function Test(title, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, fn);
	}

	if (typeof title !== 'string') {
		fn = title;
		title = null;
	}

	this.title = title || fnName(fn) || '[anonymous]';
	this.fn = isGenerator(fn) ? co.wrap(fn) : fn;
	this.assertCount = 0;
	this.planCount = null;
	this.duration = null;

	// store the time point before test execution
	// to calculate the total time spent in test
	this._timeStart = null;

	// workaround for Babel giving anonymous functions a name
	if (this.title === 'callee$0$0') {
		this.title = '[anonymous]';
	}
}

module.exports = Test;

Test.prototype._assert = function () {
	this.assertCount++;

	if (this.assertCount === this.planCount) {
		setImmediate(this.exit.bind(this));
	}
};

Object.keys(assert).forEach(function (el) {
	Test.prototype[el] = function () {
		var self = this;

		try {
			var fn = assert[el].apply(assert, arguments);

			if (fn && fn.then) {
				fn
					.then(function () {
						self._assert();
					})
					.catch(function (err) {
						self.assertError = err;
						self._assert();
					});
			} else {
				this._assert();
			}
		} catch (err) {
			this.assertError = err;
			this._assert();
		}
	};
});

// Workaround for power-assert
// `t` must be capturable for decorated assert output
Test.prototype._capt = assert._capt;
Test.prototype._expr = assert._expr;

Test.prototype.plan = function (count) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this.planCount = count;

	// in case the `planCount` doesn't match `assertCount,
	// we need the stack of this function to throw with a useful stack
	this.planStack = new Error().stack;
};

Test.prototype.run = function () {
	this.promise = {};

	// TODO: refactor this to avoid storing the promise
	return new Promise(function (resolve, reject) {
		this.promise.resolve = resolve;
		this.promise.reject = reject;

		if (!this.fn) {
			return this.exit();
		}

		this._timeStart = Date.now();

		// wait until all assertions are complete
		this._timeout = setTimeout(function () {}, TIMEOUT_MAX_VALUE);

		try {
			var ret = this.fn(this);

			if (ret && typeof ret.then === 'function') {
				ret
					.then(function () {
						if (!this.planCount || this.planCount === this.assertCount) {
							this.exit();
						}
					}.bind(this))
					.catch(function (err) {
						this.assertError = new assert.AssertionError({
							actual: err,
							message: 'Promise rejected → ' + err,
							operator: 'promise'
						});

						this.exit();
					}.bind(this));
			}
		} catch (err) {
			this.assertError = err;
			this.exit();
		}
	}.bind(this));
};

Test.prototype.end = function () {
	if (this.endCalled) {
		throw new Error('.end() called more than once');
	}

	this.endCalled = true;
	this.exit();
};

Test.prototype.exit = function () {
	// calculate total time spent in test
	this.duration = Date.now() - this._timeStart;

	// stop infinite timer
	clearTimeout(this._timeout);

	if (!this.assertError && this.planCount !== null && this.planCount !== this.assertCount) {
		this.assertError = new assert.AssertionError({
			actual: this.assertCount,
			expected: this.planCount,
			message: 'Assertion count does not match planned',
			operator: 'plan'
		});

		this.assertError.stack = this.planStack;
	}

	if (!this.ended) {
		this.ended = true;

		setImmediate(function () {
			if (this.assertError) {
				return this.promise.reject(this.assertError);
			}

			this.promise.resolve(this);
		}.bind(this));
	}
};
