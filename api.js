'use strict';
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');
var fs = require('fs');
var flatten = require('arr-flatten');
var Promise = require('bluebird');
var figures = require('figures');
var globby = require('globby');
var chalk = require('chalk');
var objectAssign = require('object-assign');
var commondir = require('commondir');
var resolveCwd = require('resolve-cwd');
var AvaError = require('./lib/ava-error');
var fork = require('./lib/fork');
var formatter = require('./lib/enhance-assert').formatter();
var CachingPrecompiler = require('./lib/caching-precompiler');
var uniqueTempDir = require('unique-temp-dir');
var findCacheDir = require('find-cache-dir');

function Api(files, options) {
	if (!(this instanceof Api)) {
		return new Api(files, options);
	}

	EventEmitter.call(this);

	this.options = options || {};
	this.options.require = (this.options.require || []).map(resolveCwd);
	this.rejectionCount = 0;
	this.exceptionCount = 0;
	this.passCount = 0;
	this.failCount = 0;
	this.fileCount = 0;
	this.testCount = 0;
	this.errors = [];
	this.stats = [];
	this.tests = [];
	this.files = files || [];
	this.base = '';

	Object.keys(Api.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

util.inherits(Api, EventEmitter);
module.exports = Api;

Api.prototype._runFile = function (file) {
	var options = objectAssign({}, this.options, {
		precompiled: this.precompiler.generateHashForFile(file)
	});
	return fork(file, options)
		.on('stats', this._handleStats)
		.on('test', this._handleTest)
		.on('unhandledRejections', this._handleRejections)
		.on('uncaughtException', this._handleExceptions)
		.on('stdout', this._handleOutput.bind(this, 'stdout'))
		.on('stderr', this._handleOutput.bind(this, 'stderr'));
};

Api.prototype._handleOutput = function (channel, data) {
	this.emit(channel, data);
};

Api.prototype._handleRejections = function (data) {
	this.rejectionCount += data.rejections.length;

	data.rejections.forEach(function (err) {
		err.type = 'rejection';
		err.file = data.file;
		this.emit('error', err);
		this.errors.push(err);
	}, this);
};

Api.prototype._handleExceptions = function (data) {
	this.exceptionCount++;
	var err = data.exception;
	err.type = 'exception';
	err.file = data.file;
	this.emit('error', err);
	this.errors.push(err);
};

Api.prototype._handleStats = function (stats) {
	this.testCount += stats.testCount;
};

Api.prototype._handleTest = function (test) {
	test.title = this._prefixTitle(test.file) + test.title;

	var isError = test.error.message;

	if (isError) {
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
	} else {
		test.error = null;
	}

	this.emit('test', test);
};

Api.prototype._prefixTitle = function (file) {
	if (this.fileCount === 1) {
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

Api.prototype.run = function () {
	var self = this;

	return handlePaths(this.files)
		.map(function (file) {
			return path.resolve(file);
		})
		.then(function (files) {
			if (files.length === 0) {
				return Promise.reject(new AvaError('Couldn\'t find any files to test'));
			}

			var cacheEnabled = self.options.cacheEnabled !== false;
			var cacheDir = (cacheEnabled && findCacheDir({name: 'ava', files: files})) ||
				uniqueTempDir();
			self.options.cacheDir = cacheDir;
			self.precompiler = new CachingPrecompiler(cacheDir);

			self.fileCount = files.length;

			self.base = path.relative('.', commondir('.', files)) + path.sep;

			var tests = files.map(self._runFile);

			// receive test count from all files and then run the tests
			var statsCount = 0;

			return new Promise(function (resolve) {
				tests.forEach(function (test) {
					var counted = false;

					function tryRun() {
						if (counted) {
							return;
						}

						if (++statsCount === self.fileCount) {
							self.emit('ready');

							var method = self.options.serial ? 'mapSeries' : 'map';

							resolve(Promise[method](files, function (file, index) {
								return tests[index].run();
							}));
						}
					}

					test.on('stats', tryRun);
					test.catch(tryRun);
				});
			});
		})
		.then(function (results) {
			// assemble stats from all tests
			self.stats = results.map(function (result) {
				return result.stats;
			});

			self.tests = results.map(function (result) {
				return result.tests;
			});

			self.tests = flatten(self.tests);

			self.passCount = sum(self.stats, 'passCount');
			self.failCount = sum(self.stats, 'failCount');
		});
};

function handlePaths(files) {
	if (files.length === 0) {
		files = [
			'test.js',
			'test-*.js',
			'test'
		];
	}

	files.push('!**/node_modules/**');
	files.push('!**/fixtures/**');
	files.push('!**/helpers/**');

	// convert pinkie-promise to Bluebird promise
	files = Promise.resolve(globby(files));

	return files
		.map(function (file) {
			if (fs.statSync(file).isDirectory()) {
				return handlePaths([path.join(file, '**', '*.js')]);
			}

			return file;
		})
		.then(flatten)
		.filter(function (file) {
			return path.extname(file) === '.js' && path.basename(file)[0] !== '_';
		});
}

function sum(arr, key) {
	var result = 0;

	arr.forEach(function (item) {
		result += item[key];
	});

	return result;
}
