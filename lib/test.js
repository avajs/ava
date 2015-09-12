'use strict';
var Promise = require('bluebird');
var setImmediate = require('set-immediate-shim');
var fnName = require('fn-name');
var assert = require('./assert');

function Test(title, assertModule, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, assertModule, fn);
	}

	if (fn === undefined) {
		if (typeof assertModule === 'function') {
			fn = assertModule;
			assertModule = null;
		} else if (typeof title === 'function') {
			fn = title;
			title = null;
		}
	}

	this.title = title || fnName(fn) || '[anonymous]';
	this.fn = fn;
	this.assertCount = 0;
	this.planCount = null;
	this.duration = null;

	// store the time point before test execution
	// to calculate the total time spent in test
	this._timeStart = null;

	// Set assert module
	this._setAssertModule(assertModule);
}

module.exports = Test;

Test.prototype._assert = function () {
	this.assertCount++;

	if (this.assertCount === this.planCount) {
		setImmediate(this.exit.bind(this));
	}
};

Test.prototype._setAssertModule = function (assertModule) {
	var lib = assertModule || assert;

	if (typeof lib === 'function') {
		setPrototype(lib.name, lib);
	} else if (typeof lib === 'object') {
		Object.keys(lib).forEach(function (el) {
			setPrototype(el, lib[el]);
		});
	}

	function setPrototype(el, method) {
		Object.defineProperty(Test.prototype, el, {
			get: function () {
				this._assert();

				return method;
			},
			configurable: true
		});
	}
};

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

		try {
			var ret = this.fn(this);

			if (ret && typeof ret.then === 'function') {
				ret.then(this.exit.bind(this)).catch(function (err) {
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

	if (this.planCount !== null && this.planCount !== this.assertCount) {
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
