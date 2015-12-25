'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var objectAssign = require('object-assign');
var Test = require('./test');
var Hook = require('./hook');

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

	this.test = makeChain({
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		callback: false
	}, this._addFn.bind(this));
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

var chainableFunctions = {
	serial: {serial: true},
	before: {type: 'before'},
	after: {type: 'after'},
	skip: {skipped: true},
	only: {exclusive: true},
	beforeEach: {type: 'beforeEach'},
	afterEach: {type: 'afterEach'},
	cb: {callback: true}
};

function makeChain(defaults, parentAdd) {
	function fn(title, fn) {
		parentAdd(defaults, title, fn);
	}

	function add(opts, title, fn) {
		opts = objectAssign({}, defaults, opts);
		parentAdd(objectAssign({}, defaults, opts), title, fn);
	}

	Object.keys(chainableFunctions).forEach(function (key) {
		Object.defineProperty(fn, key, {
			get: function () {
				return makeChain(objectAssign({}, defaults, chainableFunctions[key]), add);
			}
		});
	});

	return fn;
}

Object.keys(chainableFunctions).forEach(function (key) {
	Object.defineProperty(Runner.prototype, key, {
		get: function () {
			return this.test[key];
		}
	});
});

Runner.prototype._addFn = function (opts, title, fn) {
	var Constructor = (opts && /Each/.test(opts.type)) ? Hook : Test;
	var test = new Constructor(title, fn);
	test.metadata = objectAssign({}, opts);
	this.tests.push(test);
};

Runner.prototype._runTestWithHooks = function (test) {
	if (test.metadata.skipped) {
		return this._addTestResult(test);
	}

	function hookToTest(hook) {
		return hook.test(test.title);
	}

	var tests = this.select({type: 'beforeEach'}).map(hookToTest);
	tests.push(test);
	tests.push.apply(tests, this.select({type: 'afterEach'}).map(hookToTest));

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
	return this.tests.filter(function (test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test.metadata[key];
		});
	});
};
