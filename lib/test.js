'use strict';
var assert = require('assert');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var fnName = require('fn-name');

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

	this.title = title || fnName(fn) || '[anonymous]';
	this.fn = fn;
	this.assertCount = 0;
	this.planCount = null;
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

	this.planCount = count;
};

/**
 * Skip test
 *
 * @api public
 */

Test.prototype.skip = function () {
	this.skipTest = true;
};

/**
 * Generate a passing assertion
 *
 * @param {String} msg
 * @api public
 */

Test.prototype.pass = function (msg) {
	this.assert('ok', true, msg);
};

/**
 * Generate a failing assertion
 *
 * @param {String} msg
 * @api public
 */

Test.prototype.fail = function (msg) {
	this.assert('ok', false, msg);
};

/**
 * Assert that `val` is truthy
 *
 * @param {Mixed} val
 * @param {String} msg
 * @api public
 */

Test.prototype.true = function (val, msg) {
	this.assert('ok', val, msg);
};

/**
 * Assert that `val` is falsy
 *
 * @param {Mixed} val
 * @param {String} msg
 * @api public
 */

Test.prototype.false = function (val, msg) {
	this.assert('ok', !val, msg);
};

/**
 * Assert that `val === expected`
 *
 * @param {String} val
 * @param {String} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.is = function (val, expected, msg) {
	this.assert('strictEqual', val, expected, msg);
};

/**
 * Assert that `val !== expected`
 *
 * @param {String} val
 * @param {String} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.not = function (val, expected, msg) {
	this.assert('notStrictEqual', val, expected, msg);
};

/**
 * Assert that `val === expected`
 *
 * @param {Array|Object} val
 * @param {Array|Object} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.same = function (val, expected, msg) {
	this.assert('deepEqual', val, expected, msg);
};

/**
 * Assert that `val !== expected`
 *
 * @param {Array|Object} val
 * @param {Array|Object} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.notSame = function (val, expected, msg) {
	this.assert('notDeepEqual', val, expected, msg);
};

/**
 * Assert that `val` throws an exception
 *
 * @param {Function} val
 * @param {Function} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.throws = function (val, expected, msg) {
	this.assert('throws', val, expected, msg);
};

/**
 * Assert that `val` doesn't throws an exception
 *
 * @param {Function} val
 * @param {Function} expected
 * @param {String} msg
 * @api public
 */

Test.prototype.doesNotThrow = function (val, expected, msg) {
	this.assert('doesNotThrow', val, expected, msg);
};

/**
 * Assert that `err` is falsy
 *
 * @param {Object} err
 * @api public
 */

Test.prototype.error = function (err) {
	this.assert('ifError', err);
};

/**
 * Test assertion
 *
 * @api private
 */

Test.prototype.assert = function () {
	this.assertCount++;
	var method = [].shift.apply(arguments);

	try {
		assert[method].apply(null, arguments);
	} catch (err) {
		this.assertError = err;
	}

	if (this.assertCount === this.planCount) {
		setImmediate(this.exit.bind(this));
	}
};

/**
 * Run test
 *
 * @param {Function} cb
 * @api public
 */

Test.prototype.run = function (cb) {
	this.cb = cb;

	if (!this.fn || this.skipTest) {
		this.exit();
	}

	try {
		this.fn(this);
	} catch (err) {
		this.assertError = err;
		this.exit();
	}
};

/**
 * End test
 *
 * @api public
 */

Test.prototype.end = function () {
	if (this.endCalled) {
		this.fail('.end() called more than once');
		this.assertCount--;
	}

	this.endCalled = true;
	this.exit();
};

/**
 * Exit test
 *
 * @api private
 */

Test.prototype.exit = function () {
	if (this.planCount !== null && this.planCount !== this.assertCount) {
		this.is(this.planCount, this.assertCount, 'Assertion count does not match planned');
		this.assertCount--;
	}

	if (!this.ended) {
		this.ended = true;

		setImmediate(function () {
			this.cb.call(this, this.assertError);
		}.bind(this));
	}
};

module.exports = Test;
