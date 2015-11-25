'use strict';
var isGeneratorFn = require('is-generator-fn');
var maxTimeout = require('max-timeout');
var Promise = require('bluebird');
var fnName = require('fn-name');
var co = require('co-with-promise');
var observableToPromise = require('observable-to-promise');
var isPromise = require('is-promise');
var assert = require('./assert');
var globals = require('./globals');

function Test(title, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, fn);
	}

	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	assert.is(typeof fn, 'function', 'you must provide a callback');

	this.title = title || fnName(fn) || '[anonymous]';
	this.fn = isGeneratorFn(fn) ? co.wrap(fn) : fn;
	this.assertCount = 0;
	this.planCount = null;
	this.duration = null;
	this.assertError = undefined;

	// store the time point before test execution
	// to calculate the total time spent in test
	this._timeStart = null;

	// workaround for Babel giving anonymous functions a name
	if (this.title === 'callee$0$0') {
		this.title = '[anonymous]';
	}

	Object.keys(Test.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

module.exports = Test;

Test.prototype._assert = function () {
	this.assertCount++;

	if (this.assertCount === this.planCount) {
		globals.setImmediate(this.exit.bind(this));
	}
};

// patch assert methods to increase assert count and store errors
Object.keys(assert).forEach(function (el) {
	Test.prototype[el] = function () {
		var self = this;

		try {
			var fn = assert[el].apply(assert, arguments);

			fn = observableToPromise(fn);

			if (isPromise(fn)) {
				return Promise.resolve(fn)
					.catch(function (err) {
						self._setAssertError(err);
					})
					.finally(function () {
						self._assert();
					});
			}
		} catch (err) {
			this._setAssertError(err);
		}

		this._assert();
	};
});

Test.prototype._setAssertError = function (err) {
	if (this.assertError !== undefined) {
		return;
	}

	if (err === undefined) {
		err = 'undefined';
	}

	this.assertError = err;
};

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
	var self = this;

	this.promise = Promise.pending();

	// TODO(vdemedes): refactor this to avoid storing the promise
	if (!this.fn) {
		return this.exit();
	}

	this._timeStart = globals.now();

	// wait until all assertions are complete
	this._timeout = globals.setTimeout(function () {}, maxTimeout);

	var ret;

	try {
		ret = this.fn(this);
	} catch (err) {
		this._setAssertError(err);
		this.exit();
	}

	ret = observableToPromise(ret);

	if (isPromise(ret)) {
		ret
			.then(function () {
				if (!self.planCount || self.planCount === self.assertCount) {
					self.exit();
				}
			})
			.catch(function (err) {
				self._setAssertError(new assert.AssertionError({
					actual: err,
					message: 'Promise rejected → ' + err,
					operator: 'promise'
				}));

				self.exit();
			});
	}

	return this.promise.promise;
};

Test.prototype.end = function (err) {
	if (err) {
		this._setAssertError(new assert.AssertionError({
			actual: err,
			message: 'Callback called with an error → ' + err,
			operator: 'callback'
		}));

		this.exit();
		return;
	}

	if (this.endCalled) {
		throw new Error('.end() called more than once');
	}

	this.endCalled = true;
	this.exit();
};

Test.prototype.exit = function () {
	var self = this;

	// calculate total time spent in test
	this.duration = globals.now() - this._timeStart;

	// stop infinite timer
	globals.clearTimeout(this._timeout);

	if (this.assertError === undefined && this.planCount !== null && this.planCount !== this.assertCount) {
		this._setAssertError(new assert.AssertionError({
			actual: this.assertCount,
			expected: this.planCount,
			message: 'Assertion count does not match planned',
			operator: 'plan'
		}));

		this.assertError.stack = this.planStack;
	}

	if (!this.ended) {
		this.ended = true;

		globals.setImmediate(function () {
			if (self.assertError !== undefined) {
				self.promise.reject(self.assertError);
				return;
			}

			self.promise.resolve(self);
		});
	}
};
