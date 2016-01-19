'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var optionChain = require('option-chain');
var TestCollection = require('./test-collection');

var chainableMethods = {
	spread: true,
	defaults: {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		callback: false
	},
	chainableMethods: {
		test: {},
		serial: {serial: true},
		before: {type: 'before'},
		after: {type: 'after'},
		skip: {skipped: true},
		only: {exclusive: true},
		beforeEach: {type: 'beforeEach'},
		afterEach: {type: 'afterEach'},
		cb: {callback: true}
	}
};

function noop() {}

function each(items, fn, context) {
	return Promise.all(items.map(fn, context));
}

function eachSeries(items, fn, context) {
	return Promise.each(items, fn.bind(context));
}

function Runner(opts) {
	if (!(this instanceof Runner)) {
		return new Runner(opts);
	}

	EventEmitter.call(this);

	this.options = opts || {};
	this.results = [];
	this.tests = new TestCollection();
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

optionChain(chainableMethods, function (opts, title, fn) {
	this.tests.add(opts, title, fn);
}, Runner.prototype);

Runner.prototype._runTestWithHooks = function (test) {
	if (test.metadata.skipped) {
		return this._addTestResult(test);
	}

	var context = {};

	return eachSeries(this.tests.testsFor(test), function (test) {
		Object.defineProperty(test, 'context', {
			get: function () {
				return context;
			},
			set: function (val) {
				context = val;
			}
		});

		return this._runTest(test);
	}, this).catch(noop);
};

Runner.prototype._runTest = function (test) {
	var self = this;

	// add test result regardless of state
	// but on error, don't execute next tests
	if (test.metadata.skipped) {
		return this._addTestResult(test);
	}

	return test.run().finally(function () {
		self._addTestResult(test);
	});
};

Runner.prototype._runConcurrent = function (tests) {
	if (this.options.serial) {
		return this._runSerial(tests);
	}

	return each(tests, this._runTestWithHooks, this);
};

Runner.prototype._runSerial = function (tests) {
	return eachSeries(tests, this._runTestWithHooks, this);
};

Runner.prototype._addTestResult = function (test) {
	if (test.assertError) {
		this.stats.failCount++;
	}

	var props = {
		duration: test.duration,
		title: test.title,
		error: test.assertError,
		type: test.metadata.type,
		skip: test.metadata.skipped
	};

	this.results.push(props);
	this.emit('test', props);
};

Runner.prototype.run = function () {
	var self = this;

	var hasExclusive = this.select({
		exclusive: true,
		skipped: false,
		type: 'test'
	}).length > 0;

	var serial = this.select({
		exclusive: hasExclusive,
		serial: true,
		type: 'test'
	});

	var concurrent = this.select({
		exclusive: hasExclusive,
		serial: false,
		type: 'test'
	});

	var skipped = this.select({
		type: 'test',
		skipped: true
	});

	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		testCount: serial.length + concurrent.length - skipped.length
	};

	return eachSeries(this.select({type: 'before'}, true), this._runTest, this)
		.catch(noop)
		.then(function () {
			if (stats.failCount > 0) {
				return Promise.reject();
			}
		})
		.then(function () {
			return self._runSerial(serial);
		})
		.then(function () {
			return self._runConcurrent(concurrent);
		})
		.then(function () {
			return eachSeries(self.select({type: 'after'}, true), self._runTest, self);
		})
		.catch(noop)
		.then(function () {
			stats.passCount = stats.testCount - stats.failCount;
		});
};

Runner.prototype.select = function (filter, create) {
	var entries = this.tests.select(filter);
	return create ? entries.map(TestCollection.makeTest) : entries;
};
