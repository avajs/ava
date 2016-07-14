'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var optionChain = require('option-chain');
var matcher = require('matcher');
var TestCollection = require('./test-collection');

function noop() {}

var chainableMethods = {
	defaults: {
		type: 'test',
		serial: false,
		exclusive: false,
		skipped: false,
		todo: false,
		failing: false,
		callback: false,
		always: false
	},
	chainableMethods: {
		test: {},
		serial: {serial: true},
		before: {type: 'before'},
		after: {type: 'after'},
		skip: {skipped: true},
		todo: {todo: true},
		failing: {failing: true},
		only: {exclusive: true},
		beforeEach: {type: 'beforeEach'},
		afterEach: {type: 'afterEach'},
		cb: {callback: true},
		always: {always: true}
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
	this.hasStarted = false;
	this._bail = options.bail;
	this._serial = options.serial;
	this._match = options.match || [];
	this._addTestResult = this._addTestResult.bind(this);
	this._buildStats = this._buildStats.bind(this);
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

optionChain(chainableMethods, function (opts, args) {
	var title;
	var fn;
	var macroArgIndex;

	if (this.hasStarted) {
		throw new Error('All tests and hooks must be declared synchronously in your ' +
		'test file, and cannot be nested within other tests or hooks.');
	}

	if (typeof args[0] === 'string') {
		title = args[0];
		fn = args[1];
		macroArgIndex = 2;
	} else {
		fn = args[0];
		title = null;
		macroArgIndex = 1;
	}

	if (this._serial) {
		opts.serial = true;
	}

	if (args.length > macroArgIndex) {
		args = args.slice(macroArgIndex);
	} else {
		args = null;
	}

	if (Array.isArray(fn)) {
		fn.forEach(function (fn) {
			this._addTest(title, opts, fn, args);
		}, this);
	} else {
		this._addTest(title, opts, fn, args);
	}
}, Runner.prototype);

function wrapFunction(fn, args) {
	return function (t) {
		return fn.apply(this, [t].concat(args));
	};
}

Runner.prototype._addTest = function (title, opts, fn, args) {
	if (args) {
		if (fn.title) {
			title = fn.title.apply(fn, [title || ''].concat(args));
		}

		fn = wrapFunction(fn, args);
	}

	if (opts.type === 'test' && this._match.length > 0) {
		opts.exclusive = title !== null && matcher([title], this._match).length === 1;
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

	this.tests.add({
		metadata: opts,
		fn: fn,
		title: title
	});
};

Runner.prototype._addTestResult = function (result) {
	var test = result.result;
	var props = {
		duration: test.duration,
		title: test.title,
		error: result.reason,
		type: test.metadata.type,
		skip: test.metadata.skipped,
		todo: test.metadata.todo,
		failing: test.metadata.failing
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

	stats.knownFailureCount = this.results
		.filter(function (result) {
			return result.passed === true && result.result.metadata.failing;
		})
		.length;

	stats.passCount = stats.testCount - stats.failCount - stats.skipCount - stats.todoCount;

	return stats;
};

Runner.prototype.run = function (options) {
	if (options.runOnlyExclusive && !this.tests.hasExclusive) {
		return Promise.resolve(null);
	}

	this.tests.on('test', this._addTestResult);

	this.hasStarted = true;

	return Promise.resolve(this.tests.build(this._bail).run()).then(this._buildStats);
};

Runner._chainableMethods = chainableMethods.chainableMethods;
