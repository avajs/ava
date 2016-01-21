'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var objectAssign = require('object-assign');
var Test = require('./test');
var Hook = require('./hook');
var optionChain = require('option-chain');

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
	this.tests = [];
	this.testsByType = {};
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

optionChain(chainableMethods, function (opts, title, fn) {
	var Constructor = (opts && /Each/.test(opts.type)) ? Hook : Test;
	var test = new Constructor(title, fn);
	test.metadata = objectAssign({}, opts);
	this._addTest(test);
}, Runner.prototype);

Runner.prototype._addTest = function (test) {
	this.tests.push(test);
	var type = test.metadata.type;
	var tests = this.testsByType[type] || (this.testsByType[type] = []);
	tests.push(test);
};

Runner.prototype._runTestWithHooks = function (test) {
	if (test.metadata.skipped) {
		return this._addTestResult(test);
	}

	function hookToTest(hook) {
		return hook.test(test.title);
	}

	var tests = (this.testsByType.beforeEach || []).map(hookToTest);
	tests.push(test);
	tests.push.apply(tests, (this.testsByType.afterEach || []).map(hookToTest));

	var context = {};

	return eachSeries(tests, function (test) {
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

	return eachSeries(this.select({type: 'before'}), this._runTest, this)
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
			return eachSeries(self.select({type: 'after'}), self._runTest, self);
		})
		.catch(noop)
		.then(function () {
			stats.passCount = stats.testCount - stats.failCount;
		});
};

Runner.prototype.select = function (filter) {
	var tests = filter.type ? this.testsByType[filter.type] || [] : this.tests;

	return tests.filter(function (test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test.metadata[key];
		});
	});
};
