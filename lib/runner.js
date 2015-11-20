'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var hasFlag = require('has-flag');
var Test = require('./test');
var Hook = require('./hook');
var send = require('./send');
var objectAssign = require('object-assign');

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

	this.results = [];

	this.tests = [];
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

Runner.prototype._addTest = function (Constructor, title, fn, opts) {
	var test = new Constructor(title, fn);

	objectAssign(test, {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false
	}, opts);

	this.tests.push(test);
};

var chainableFunctions = {
	serial: {serial: 'true'},
	before: {type: 'before'},
	after: {type: 'after'},
	skip: {skipped: true},
	only: {exclusive: true},
	beforeEach: {type: 'beforeEach'},
	afterEach: {type: 'afterEach'}
};

function makeFn(defaultOpts) {
	defaultOpts = objectAssign({}, defaultOpts);
	var Constructor = (defaultOpts && /Each/.test(defaultOpts.type)) ? Hook : Test;
	return function (title, fn) {
		this._addTest(Constructor, title, fn, defaultOpts);
	};
}

function makeChain(defaults, add) {
	var obj = {
		_addTest: function (Constructor, title, fn, opts) {
			var test = new Constructor(title, fn);

			objectAssign(test, defaults, opts);

			add(test);
		}
	};

	var fn = makeFn(objectAssign({}, defaults)).bind(obj);

	Object.keys(chainableFunctions).forEach(function (key) {
		Object.defineProperty(fn, key, {
			get: function () {
				return makeChain(objectAssign({}, defaults, chainableFunctions[key]), add);
			}
		});
	});

	return fn;
}

Runner.prototype.chain = function () {
	var add = (function add(test) {
		this.tests.push(test);
	}).bind(this);

	return makeChain({
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false
	}, add);
};

// TODO (jamestalmage): These are now all redundant with chain().XXX - only unit tests depend on them now - drop and refactor unit tests.
Runner.prototype.addTest = makeFn({});
Runner.prototype.addSerialTest = makeFn({serial: true});
Runner.prototype.addBeforeHook = makeFn({type: 'before'});
Runner.prototype.addAfterHook = makeFn({type: 'after'});
Runner.prototype.addSkippedTest = makeFn({skipped: true});
Runner.prototype.addOnlyTest = makeFn({exclusive: true});
Runner.prototype.addBeforeEachHook = makeFn({type: 'beforeEach'});
Runner.prototype.addAfterEachHook = makeFn({type: 'afterEach'});

Runner.prototype._runTestWithHooks = function (test) {
	if (test.skip) {
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
	return test.run().finally(function () {
		self._addTestResult(test);
	});
};

Runner.prototype.concurrent = function (tests) {
	if (hasFlag('serial')) {
		return this.serial(tests);
	}

	return each(tests, this._runTestWithHooks, this);
};

Runner.prototype.serial = function (tests) {
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
		type: test.type,
		skip: test.skip
	};

	this.results.push(props);
	this.emit('test', props);
};

Runner.prototype.run = function () {
	var self = this;
	var hasExclusive = Boolean(this.select({exclusive: true, skipped: false, type: 'test'}).length);
	var serial = this.select({exclusive: hasExclusive, skipped: false, serial: true, type: 'test'});
	var concurrent = this.select({exclusive: hasExclusive, skipped: false, serial: false, type: 'test'});

	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		testCount: serial.length + concurrent.length
	};

	// Runner is executed directly in tests, in that case process.send() == undefined
	if (process.send) {
		send('stats', stats);
	}

	return eachSeries(this.select({type: 'before'}), this._runTest, this)
		.catch(noop)
		.then(function () {
			if (stats.failCount > 0) {
				return Promise.reject();
			}
		})
		.then(function () {
			return self.serial(serial);
		})
		.then(function () {
			return self.concurrent(concurrent);
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
	function filterFn(test) {
		return Object.keys(filter).every(function (key) {
			return filter[key] === test[key];
		});
	}
	return this.tests.filter(filterFn);
};
