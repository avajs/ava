'use strict';
const EventEmitter = require('events');
const chalk = require('chalk');
const flatten = require('arr-flatten');
const figures = require('figures');
const autoBind = require('auto-bind');
const prefixTitle = require('./prefix-title');

function sum(arr, key) {
	let result = 0;

	arr.forEach(item => {
		result += item[key];
	});

	return result;
}

class RunStatus extends EventEmitter {
	constructor(opts) {
		super();

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
		this.remainingCount = 0;
		this.previousFailCount = 0;
		this.knownFailures = [];
		this.errors = [];
		this.stats = [];
		this.tests = [];
		this.failFastEnabled = opts.failFast || false;
		this.updateSnapshots = opts.updateSnapshots || false;

		autoBind(this);
	}

	observeFork(emitter) {
		emitter
			.on('teardown', this.handleTeardown)
			.on('stats', this.handleStats)
			.on('test', this.handleTest)
			.on('unhandledRejections', this.handleRejections)
			.on('uncaughtException', this.handleExceptions)
			.on('stdout', this.handleOutput.bind(this, 'stdout'))
			.on('stderr', this.handleOutput.bind(this, 'stderr'));
	}

	handleRejections(data) {
		this.rejectionCount += data.rejections.length;

		data.rejections.forEach(err => {
			err.type = 'rejection';
			err.file = data.file;
			this.emit('error', err, this);
			this.errors.push(err);
		});
	}

	handleExceptions(data) {
		this.exceptionCount++;
		const err = data.exception;
		err.type = 'exception';
		err.file = data.file;
		this.emit('error', err, this);
		this.errors.push(err);
	}

	handleTeardown(data) {
		this.emit('dependencies', data.file, data.dependencies, this);
		this.emit('touchedFiles', data.touchedFiles);
	}

	handleStats(stats) {
		this.emit('stats', stats, this);

		if (stats.hasExclusive) {
			this.hasExclusive = true;
		}

		this.testCount += stats.testCount;
	}

	handleTest(test) {
		test.title = this.prefixTitle(test.file) + test.title;

		if (test.error) {
			this.errors.push(test);
		}

		if (test.failing && !test.error) {
			this.knownFailures.push(test);
		}

		this.emit('test', test, this);
	}

	prefixTitle(file) {
		if (!this.prefixTitles) {
			return '';
		}

		const separator = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

		return prefixTitle(file, this.base, separator);
	}

	handleOutput(channel, data) {
		this.emit(channel, data, this);
	}

	processResults(results) {
		// Assemble stats from all tests
		this.stats = results.map(result => result.stats);
		this.tests = results.map(result => result.tests);
		this.tests = flatten(this.tests);
		this.passCount = sum(this.stats, 'passCount');
		this.knownFailureCount = sum(this.stats, 'knownFailureCount');
		this.skipCount = sum(this.stats, 'skipCount');
		this.todoCount = sum(this.stats, 'todoCount');
		this.failCount = sum(this.stats, 'failCount');
		this.remainingCount = this.testCount - this.passCount - this.failCount - this.skipCount - this.todoCount - this.knownFailureCount;
	}
}

module.exports = RunStatus;
