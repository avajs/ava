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

	EventEmitter.call(this);

	options = options || {};

	this.results = [];
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
		if (typeof fn === 'function') {
			throw new TypeError('`todo` tests are not allowed to have an implementation. Use `test.skip()` for tests with an implementation.');
		}

		fn = noop;

		if (typeof title !== 'string') {
			throw new TypeError('`todo` tests require a title');
		}
	} else if (typeof fn !== 'function') {
		throw new TypeError('Expected an implementation. Use `test.todo()` for tests without an implementation.');
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

	this.results.push(result);
	this.emit('test', props);
};

Runner.prototype._buildStats = function () {
	var stats = {
		testCount: 0,
		skipCount: 0,
		todoCount: 0
	};

	this.results
		.map(function (result) {
			return result.result;
		})
		.filter(function (test) {
			return test.metadata.type === 'test';
		})
		.forEach(function (test) {
			stats.testCount++;

			if (test.metadata.skipped) {
				stats.skipCount++;
			}

			if (test.metadata.todo) {
				stats.todoCount++;
			}
		});

	stats.failCount = this.results
		.filter(function (result) {
			return result.passed === false;
		})
		.length;

	stats.passCount = stats.testCount - stats.failCount - stats.skipCount - stats.todoCount;

	return stats;
};

Runner.prototype.run = function (options) {
	var self = this;

	this.stats = {
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
		self.stats = self._buildStats();

		return self.stats;
	});
};
