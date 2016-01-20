'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var optionChain = require('option-chain');
var TestCollection = require('./test-collection');
var Sequence = require('./sequence');

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

	var phaseData = this.tests._buildPhases();
	var phases = phaseData.phases;
	var stats = this.stats = {
		failCount: 0,
		passCount: 0,
		testCount: phaseData.stats.testCount
	};

	return eachSeries(phases, function (phase) {
		return each(phase, function (tests) {
			return new Sequence(tests)
				.on('test', function test(test) {
					self._addTestResult(test);
				})
				.run();
		});
	}).then(function () {
		stats.passCount = stats.testCount - stats.failCount;
	});
};

Runner.prototype.select = function (filter) {
	return this.tests.select(filter);
};
