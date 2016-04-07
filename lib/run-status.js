'use strict';
var path = require('path');
var util = require('util');
var chalk = require('chalk');
var isObj = require('is-obj');
var flatten = require('arr-flatten');
var figures = require('figures');
var EventEmitter = require('events').EventEmitter;
var formatter = require('./enhance-assert').formatter();

function TestData(opts) {
	if (!(this instanceof TestData)) {
		throw new TypeError('Class constructor TestData cannot be invoked without \'new\'');
	}
	EventEmitter.call(this);

	opts = opts || {};
	this.prefixTitles = opts.prefixTitles !== false;
	this.hasExclusive = Boolean(opts.runOnlyExclusive);
	this.base = opts.base || '';

	this.rejectionCount = 0;
	this.exceptionCount = 0;
	this.passCount = 0;
	this.skipCount = 0;
	this.todoCount = 0;
	this.failCount = 0;
	this.fileCount = 0;
	this.testCount = 0;
	this.errors = [];
	this.stats = [];
	this.tests = [];

	Object.keys(TestData.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

util.inherits(TestData, EventEmitter);
module.exports = TestData;

TestData.prototype.observeFork = function (emitter) {
	emitter
		.on('teardown', this.handleTeardown)
		.on('stats', this.handleStats)
		.on('test', this.handleTest)
		.on('unhandledRejections', this.handleRejections)
		.on('uncaughtException', this.handleExceptions)
		.on('stdout', this.handleOutput.bind(this, 'stdout'))
		.on('stderr', this.handleOutput.bind(this, 'stderr'));
};

function normalizeError(err) {
	if (!isObj(err)) {
		err = {
			message: err,
			stack: err
		};
	}

	return err;
}

TestData.prototype.handleRejections = function (data) {
	this.rejectionCount += data.rejections.length;

	data.rejections.forEach(function (err) {
		err = normalizeError(err);
		err.type = 'rejection';
		err.file = data.file;
		this.emit('error', err, this);
		this.errors.push(err);
	}, this);
};

TestData.prototype.handleExceptions = function (data) {
	this.exceptionCount++;
	var err = normalizeError(data.exception);
	err.type = 'exception';
	err.file = data.file;
	this.emit('error', err, this);
	this.errors.push(err);
};

TestData.prototype.handleTeardown = function (data) {
	this.emit('dependencies', data.file, data.dependencies, this);
};

TestData.prototype.handleStats = function (stats) {
	this.emit('stats', stats, this);

	if (this.hasExclusive && !stats.hasExclusive) {
		return;
	}

	if (!this.hasExclusive && stats.hasExclusive) {
		this.hasExclusive = true;
		this.testCount = 0;
	}

	this.testCount += stats.testCount;
};

TestData.prototype.handleTest = function (test) {
	test.title = this.prefixTitle(test.file) + test.title;

	if (test.error) {
		if (test.error.powerAssertContext) {
			var message = formatter(test.error.powerAssertContext);

			if (test.error.originalMessage) {
				message = test.error.originalMessage + ' ' + message;
			}

			test.error.message = message;
		}

		if (test.error.name !== 'AssertionError') {
			test.error.message = 'failed with "' + test.error.message + '"';
		}

		this.errors.push(test);
	}

	this.emit('test', test, this);
};

TestData.prototype.prefixTitle = function (file) {
	if (!this.prefixTitles) {
		return '';
	}

	var separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

	var prefix = path.relative('.', file)
		.replace(this.base, '')
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test\-/g, '')
		.replace(/\.js$/, '')
		.split(path.sep)
		.join(separator);

	if (prefix.length > 0) {
		prefix += separator;
	}

	return prefix;
};

TestData.prototype.handleOutput = function (channel, data) {
	this.emit(channel, data, this);
};

TestData.prototype.processResults = function (results) {
	// assemble stats from all tests
	this.stats = results.map(function (result) {
		return result.stats;
	});

	this.tests = results.map(function (result) {
		return result.tests;
	});

	this.tests = flatten(this.tests);

	this.passCount = sum(this.stats, 'passCount');
	this.skipCount = sum(this.stats, 'skipCount');
	this.todoCount = sum(this.stats, 'todoCount');
	this.failCount = sum(this.stats, 'failCount');
};

function sum(arr, key) {
	var result = 0;

	arr.forEach(function (item) {
		result += item[key];
	});

	return result;
}
