'use strict';
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var fnName = require('fn-name');
var claim = require('claim');

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

util.inherits(Test, EventEmitter);
module.exports = Test;

Test.prototype._assert = function () {
	if (++this.assertCount === this.planCount) {
		setImmediate(this.exit.bind(this));
	}
}

// TODO: find a better way to count assertions
// decorate the `claim` methods with our assert counter
Object.keys(claim).forEach(function (el) {
	Test.prototype[el] = function () {
		this._assert();
		claim[el].apply(claim, arguments);
	};
});

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
		throw new Error('.end() called more than once');
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
		this.assertError = new assert.AssertionError({
			actual: this.assertCount,
			expected: this.planCount,
			message: 'Assertion count does not match planned',
			operator: 'plan',
			stackStartFunction: this.fn // TODO: find out why it doesn't show any stack
		});
	}

	if (!this.ended) {
		this.ended = true;

		setImmediate(function () {
			this.cb.call(this, this.assertError);
		}.bind(this));
	}
};
