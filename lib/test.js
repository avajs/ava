'use strict';
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var fnName = require('fn-name');
var claim = require('claim');
var objectAssign = require('object-assign');

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

objectAssign(Test.prototype, EventEmitter.prototype);
objectAssign(Test.prototype, claim);
module.exports = Test;

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
		throw new Error('Assertion count does not match planned');
	}

	if (!this.ended) {
		this.ended = true;

		setImmediate(function () {
			this.cb.call(this, this.assertError);
		}.bind(this));
	}
};
