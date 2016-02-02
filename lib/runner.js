'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var optionChain = require('option-chain');
var TestCollection = require('./test-collection');

function Runner(options) {
	if (!(this instanceof Runner)) {
		throw new TypeError('Class constructor Runner cannot be invoked without \'new\'');
	}
	options = options || {};

	EventEmitter.call(this);

	this.results = [];
	this.tests = new TestCollection();
	this.bail = Boolean(options.bail);
	this._addTestResult = this._addTestResult.bind(this);

	var chainableMethods = {
		spread: true,
		defaults: {
			type: 'test',
			serial: Boolean(options.serial),
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

	optionChain(chainableMethods, function (opts, title, fn) {
		if (typeof title === 'function') {
			fn = title;
			title = null;
		}

		this.tests.add({
			metadata: opts,
			fn: fn,
			title: title
		});
	}, this);
}

util.inherits(Runner, EventEmitter);
module.exports = Runner;

Runner.prototype._addTestResult = function (result) {
	if (result.result.metadata.type === 'test') {
		this.stats.testCount++;

		if (result.result.metadata.skipped) {
			this.stats.skipCount++;
		}
	}

	if (!result.passed) {
		this.stats.failCount++;
	}

	var test = result.result;

	var props = {
		duration: test.duration,
		title: test.title,
		error: result.reason,
		type: test.metadata.type,
		skip: test.metadata.skipped
	};

	this.results.push(props);
	this.emit('test', props);
};

Runner.prototype.run = function () {
	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		skipCount: 0,
		testCount: 0
	};

	return Promise.resolve(this.tests.buildPhases(this._addTestResult, this.bail).run()).then(function () {
		stats.passCount = stats.testCount - stats.failCount - stats.skipCount;
	});
};
