'use strict';
var assert = require('assert');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

inherits(Test, EventEmitter);

function Test(title, fn) {
	if (!(this instanceof Test)) {
		return new Test(title, fn);
	}

	if (typeof title !== 'string') {
		fn = title;
		title = null;
	}

	this.title = title || fn.name || '[anonymous]';
	this._fn = fn;
	this._skip = false;
	this._planCount = null;
	this._assertCount = 0;
	this._assertError = null;
	this._endCalled = false;
	this._ended = false;
}

Test.prototype.end = function () {
	if (this._endCalled) {
		this._assert(false, {
			msg: '.end() called more than once'
		});
	}

	this._endCalled = true;
	this._end();
};

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
		}.bind(this))
	}
};

/*
TODO:
t.is() or t.equal() ??
t.not() or t.notEqual() ??
t.same() or t.deepEqual() ??
t.notDeepEqual()
t.throws()
t.doesNotThrow()
*/

Test.prototype.true = function (val, msg) {
	this._assert(val, {
		message: msg,
		operator: 'true',
		expected: true,
		actual: val
	});
};

Test.prototype.false = function (val, msg) {
	this._assert(val, {
		message: msg,
		operator: 'false',
		expected: false,
		actual: val
	});
};

Test.prototype.error = function (err, msg) {
	this._assert(!err, {
		message: msg || err.toString(), // TODO: show the stack or something useful
		operator: 'error',
		actual: err
	});
};

Test.prototype.fail = function (msg) {
	this._assert(false, {
		message: msg,
		operator: 'fail'
	});
};

Test.prototype._assert = function (ok, opts) {
	console.error('assert count', this._assertCount);
	this._assertCount++;

	if (!ok) {
		opts.stackStartFunction = this._fn;
		this._assertError = new assert.AssertionError(opts);
	}

	if (this._assertCount === this._planCount) {
		// delay end so all assertion have a chance to
		// run so we can catch unplanned assertions
		setImmediate(this._end.bind(this));
	}
};

Test.prototype.plan = function (count) {
	if (typeof count !== 'number') {
		throw new TypeError('Expected a number');
	}

	this._planCount = count;
};

Test.prototype.skip = function () {
	this._skip = true;
};

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

module.exports = Test;
