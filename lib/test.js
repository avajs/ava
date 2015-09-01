'use strict';
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var fnName = require('fn-name');
var claim = require('claim');

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

	// store the time point
	// before test execution
	// to pass it to process.hrtime()
	// and calculate the total time spent in test
	this._timeStart = 0;
}

util.inherits(Test, EventEmitter);
module.exports = Test;

Test.prototype._assert = function () {
	this.assertCount++;

	if (this.assertCount === this.planCount) {
		setImmediate(this.exit.bind(this));
	}
};

// TODO: find a better way to count assertions
// decorate the `claim` methods with our assert counter
Object.keys(claim).forEach(function (el) {
	Test.prototype[el] = function () {
		this._assert();

		try {
			claim[el].apply(claim, arguments);
		} catch (err) {
			this.assertError = err;
		}
	};
});

Test.prototype.plan = function (count) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this.planCount = count;
};

Test.prototype.skip = function () {
	this.skipTest = true;
};

Test.prototype.run = function (cb) {
	this.cb = cb;

	if (!this.fn || this.skipTest) {
		this.exit();
	}

	this._timeStart = process.hrtime();

	try {
		var ret = this.fn(this);

		if (ret && typeof ret.then === 'function') {
			ret.then(this.exit.bind(this)).catch(function (err) {
				this.assertError = new assert.AssertionError({
					actual: err,
					message: 'Promise rejected → ' + err,
					operator: 'promise',
					stackStartFunction: this
				});

				this.exit();
			}.bind(this));
		}
	} catch (err) {
		this.assertError = err;
		this.exit();
	}
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
	var duration = process.hrtime(this._timeStart);

	if (this.planCount !== null && this.planCount !== this.assertCount) {
		this.assertError = new assert.AssertionError({
			actual: this.assertCount,
			expected: this.planCount,
			message: 'Assertion count does not match planned',
			operator: 'plan',
			// TODO: find out why it doesn't show any stack
			stackStartFunction: this.fn
		});
	}

	if (!this.ended) {
		this.ended = true;

		setImmediate(function () {
			this.cb(this.assertError, duration);
		}.bind(this));
	}
};
