'use strict';
var assert = require('assert');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var deepEqual = require('deep-equal');
var throws = require('throws');

/**
 * Initialize a new `Test`
 *
 * @param {String} title
 * @param {Function} fn
 * @api public
 */

function Test(title, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, fn);
	}

	if (typeof title !== 'string') {
		fn = title;
		title = null;
	}

	EventEmitter.call(this);

	this.title = title || fn.name || '[anonymous]';
	this._fn = fn;
	this._skip = false;
	this._planCount = null;
	this._assertCount = 0;
	this._assertError = null;
	this._endCalled = false;
	this._ended = false;
}

inherits(Test, EventEmitter);

/**
 * Plan number of assertions
 *
 * @param {Number} count
 * @api public
 */

Test.prototype.plan = function (count) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this._planCount = count;
};

/**
 * Skip test
 *
 * @api public
 */

Test.prototype.skip = function () {
	this._skip = true;
};

/**
 * Run test
 *
 * @param {Function} cb
 * @api public
 */

Test.prototype.run = function (cb) {
	if (!this._fn || this._skip) {
		return;
	}

	this.on('end', function (err) {
		cb.call(this, err);
	});

	try {
		this._fn(this);
	} catch (err) {
		this.error(err);
		this._end();
	}
};

/**
 * End test
 *
 * @api public
 */

Test.prototype.end = function () {
	if (this._endCalled) {
		this._assert(false, {
			msg: '.end() called more than once'
		});
	}

	this._endCalled = true;
	this._end();
};

/**
 * Assert that `actual` is truthy
 *
 * @param {Mixed} actual
 * @param {String} msg
 * @api public
 */

Test.prototype.true = function (actual, msg) {
	var val = true;

	if (!actual) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '===',
		expected: true,
		actual: actual
	});
};

/**
 * Assert that `actual` is falsy
 *
 * @param {Mixed} actual
 * @param {String} msg
 * @api public
 */

Test.prototype.false = function (actual, msg) {
	var val = true;

	if (actual) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '!==',
		expected: false,
		actual: actual
	});
};

/**
 * Assert that `actual === expected`
 *
 * @param {String} actual
 * @param {String} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.is = function (actual, expected, msg) {
	var val = true;

	if (actual !== expected) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '===',
		expected: expected,
		actual: actual
	});
};

/**
 * Assert that `actual !== expected`
 *
 * @param {String} actual
 * @param {String} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.not = function (actual, expected, msg) {
	var val = true;

	if (actual === expected) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '!==',
		expected: expected,
		actual: actual
	});
};

/**
 * Assert that `actual` and `expected` have the same structure
 *
 * @param {Array|Object} actual
 * @param {Array|Object} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.same = function (actual, expected, msg) {
	var val = true;

	if (!deepEqual(actual, expected)) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '===',
		expected: expected,
		actual: actual
	});
};

/**
 * Assert that `actual` and `expected` don't have the same structure
 *
 * @param {Array|Object} actual
 * @param {Array|Object} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.notSame = function (actual, expected, msg) {
	var val = true;

	if (deepEqual(actual, expected)) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: '!==',
		expected: expected,
		actual: actual
	});
};

/**
 * Assert that `actual` throws an exception
 *
 * @param {Function} actual
 * @param {String} msg
 * @api public
 */

Test.prototype.throws = function (actual, msg) {
	var val = true;

	if (!throws(actual)) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: 'throws',
		expected: null,
		actual: actual
	});
};

/**
 * Assert that `actual` doesn't throw an exception
 *
 * @param {Function} actual
 * @param {String} msg
 * @api public
 */

Test.prototype.doesNotThrow = function (actual, msg) {
	var val = true;

	if (throws(actual)) {
		val = false;
	}

	this._assert(val, {
		message: msg,
		operator: 'throws',
		expected: null,
		actual: actual
	});
};

/**
 * Assert that `err` is falsy
 *
 * @param {Mixed} actual
 * @param {Mixed} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.error = function (err, msg) {
	this._assert(!err, {
		message: msg || err.toString(),
		operator: 'error',
		actual: err
	});
};

/**
 * Generate a failing assertion
 *
 * @param {String} msg
 * @api public
 */

Test.prototype.fail = function (msg) {
	this._assert(false, {
		message: msg,
		operator: 'fail'
	});
};

/**
 * Handle end of test
 *
 * @api private
 */

Test.prototype._end = function () {
	if (this._planCount !== null && this._planCount !== this._assertCount) {
		this._assert(false, {
			msg: 'Assertion count doens\'t match planned',
			actual: this._assertCount,
			expected: this._planCount
		});
	}

	if (!this._ended) {
		this._ended = true;
		setImmediate(function () {
			this.emit('end', this._assertError);
		}.bind(this));
	}
};

/**
 * Test assertion
 *
 * @param {Boolean} ok
 * @param {Object} opts
 * @api private
 */

Test.prototype._assert = function (ok, opts) {
	this._assertCount++;
	console.error('assert count', this._assertCount);

	if (!ok) {
		opts.stackStartFunction = this._fn;
		this._assertError = new assert.AssertionError(opts);
	}

	if (this._assertCount === this._planCount) {
		setImmediate(this._end.bind(this));
	}
};

module.exports = Test;
