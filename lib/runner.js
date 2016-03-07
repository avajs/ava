'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var optionChain = require('option-chain');
var matcher = require('matcher');
var TestCollection = require('./test-collection');

function noop() {}

var chainableMethods = {
	spread: true,
	defaults: {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		todo: false,
		callback: false
	},
	chainableMethods: {
		test: {},
		serial: {serial: true},
		before: {type: 'before'},
		after: {type: 'after'},
		skip: {skipped: true},
		todo: {todo: true},
		only: {exclusive: true},
		beforeEach: {type: 'beforeEach'},
		afterEach: {type: 'afterEach'},
		cb: {callback: true}
	}
};

function Runner(options) {
	if (!(this instanceof Runner)) {
		throw new TypeError('Class constructor Runner cannot be invoked without \'new\'');
	}
	options = options || {};

	EventEmitter.call(this);

	this.tests = new TestCollection();
	this._bail = options.bail;
	this._serial = options.serial;
	this._match = options.match || [];

	this._addTestResult = this._addTestResult.bind(this);
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

optionChain(chainableMethods, function (opts, title, fn) {
	if (typeof title === 'function') {
		fn = title;
		title = null;
	}

	if (opts.todo) {
		fn = noop;

		if (typeof title !== 'string') {
			throw new TypeError('`todo` tests require a title');
		}
	} else if (typeof fn !== 'function') {
		throw new TypeError('Expected a function. Use `test.todo()` for tests without a function.');
	}

	if (this._serial) {
		opts.serial = true;
	}

	if (opts.type === 'test' && this._match.length > 0) {
		opts.exclusive = title !== null && matcher([title], this._match).length === 1;
	}

	this.tests.add({
		metadata: opts,
		fn: fn,
		title: title
	});
}, Runner.prototype);

Runner.prototype._addTestResult = function (result) {
	var test = result.result;

	if (test.metadata.type === 'test') {
		this.stats.testCount++;

		if (test.metadata.todo) {
			this.stats.todoCount++;
		} else if (test.metadata.skipped) {
			this.stats.skipCount++;
		}
	}

	if (!result.passed) {
		this.stats.failCount++;
	}

	var props = {
		duration: test.duration,
		title: test.title,
		error: result.reason,
		type: test.metadata.type,
		skip: test.metadata.skipped,
		todo: test.metadata.todo
	};

	this.emit('test', props);
};

Runner.prototype.run = function (options) {
	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		skipCount: 0,
		todoCount: 0,
		testCount: 0
	};

	if (options.runOnlyExclusive && !this.tests.hasExclusive) {
		return Promise.resolve();
	}

	this.tests.on('test', this._addTestResult);

	return Promise.resolve(this.tests.build(this._bail).run()).then(function () {
		stats.passCount = stats.testCount - stats.failCount - stats.skipCount - stats.todoCount;
	});
};
