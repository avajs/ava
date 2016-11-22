'use strict';
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const chalk = require('chalk');
const isObj = require('is-obj');
const flatten = require('arr-flatten');
const figures = require('figures');
const autoBind = require('auto-bind');
const prefixTitle = require('./prefix-title');

function RunStatus(opts) {
	if (!(this instanceof RunStatus)) {
		throw new TypeError('Class constructor RunStatus cannot be invoked without \'new\'');
	}

	EventEmitter.call(this);

	opts = opts || {};
	this.prefixTitles = opts.prefixTitles !== false;
	this.hasExclusive = Boolean(opts.runOnlyExclusive);
	this.base = opts.base || '';
	this.rejectionCount = 0;
	this.exceptionCount = 0;
	this.passCount = 0;
	this.knownFailureCount = 0;
	this.skipCount = 0;
	this.todoCount = 0;
	this.failCount = 0;
	this.fileCount = 0;
	this.testCount = 0;
	this.previousFailCount = 0;
	this.knownFailures = [];
	this.errors = [];
	this.stats = [];
	this.tests = [];

	autoBind(this);
}

util.inherits(RunStatus, EventEmitter);
module.exports = RunStatus;

RunStatus.prototype.observeFork = function (emitter) {
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

RunStatus.prototype.handleRejections = function (data) {
	this.rejectionCount += data.rejections.length;

	data.rejections.forEach(err => {
		err = normalizeError(err);
		err.type = 'rejection';
		err.file = data.file;
		this.emit('error', err, this);
		this.errors.push(err);
	});
};

RunStatus.prototype.handleExceptions = function (data) {
	this.exceptionCount++;
	const err = normalizeError(data.exception);
	err.type = 'exception';
	err.file = data.file;
	this.emit('error', err, this);
	this.errors.push(err);
};

RunStatus.prototype.handleTeardown = function (data) {
	this.emit('dependencies', data.file, data.dependencies, this);
};

RunStatus.prototype.handleStats = function (stats) {
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

RunStatus.prototype.handleTest = function (test) {
	test.title = this.prefixTitle(test.file) + test.title;

	if (test.error) {
		if (test.error.name !== 'AssertionError') {
			test.error.message = `Error: ${test.error.message}`;
		}

		this.errors.push(test);
	}

	if (test.failing && !test.error) {
		this.knownFailures.push(test);
	}

	this.emit('test', test, this);
};

RunStatus.prototype.prefixTitle = function (file) {
	if (!this.prefixTitles) {
		return '';
	}

	const separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

	return prefixTitle(file, this.base, separator);
};

RunStatus.prototype.handleOutput = function (channel, data) {
	this.emit(channel, data, this);
};

RunStatus.prototype.processResults = function (results) {
	// assemble stats from all tests
	this.stats = results.map(result => result.stats);
	this.tests = results.map(result => result.tests);
	this.tests = flatten(this.tests);
	this.passCount = sum(this.stats, 'passCount');
	this.knownFailureCount = sum(this.stats, 'knownFailureCount');
	this.skipCount = sum(this.stats, 'skipCount');
	this.todoCount = sum(this.stats, 'todoCount');
	this.failCount = sum(this.stats, 'failCount');
};

function sum(arr, key) {
	let result = 0;

	arr.forEach(item => {
		result += item[key];
	});

	return result;
}
