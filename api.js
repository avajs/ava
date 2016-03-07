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
var commonPathPrefix = require('common-path-prefix');
var resolveCwd = require('resolve-cwd');
var uniqueTempDir = require('unique-temp-dir');
var findCacheDir = require('find-cache-dir');
var slash = require('slash');
var getPort = require('get-port');
var AvaError = require('./lib/ava-error');
var fork = require('./lib/fork');
var formatter = require('./lib/enhance-assert').formatter();
var CachingPrecompiler = require('./lib/caching-precompiler');

function Api(options) {
	if (!(this instanceof Api)) {
		throw new TypeError('Class constructor Api cannot be invoked without \'new\'');
	}

	EventEmitter.call(this);

	this.options = options || {};
	this.options.require = (this.options.require || []).map(resolveCwd);

	this.excludePatterns = [
		'!**/node_modules/**',
		'!**/fixtures/**',
		'!**/helpers/**'
	];

	Object.keys(Api.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);

	this._reset();
}

util.inherits(Api, EventEmitter);
module.exports = Api;

Api.prototype._reset = function () {
	this.rejectionCount = 0;
	this.exceptionCount = 0;
	this.passCount = 0;
	this.skipCount = 0;
	this.todoCount = 0;
	this.failCount = 0;
	this.fileCount = 0;
	this.testCount = 0;
	this.hasExclusive = false;
	this.errors = [];
	this.stats = [];
	this.tests = [];
	this.base = '';
};

Api.prototype._runFile = function (file, onForkStarting) {
	var options = objectAssign({}, this.options, {
		precompiled: this.precompiler.generateHashForFile(file)
	});

	var execArgv = process.execArgv.slice();
	var debugArgIndex = -1;
	for (var i = 0; i < execArgv.length; i++) {
		if (execArgv[i].indexOf('--debug-brk=') === 0 || execArgv[i].indexOf('--debug=') === 0) {
			debugArgIndex = i;
			break;
		}
	}

	var execArgvPromise;
	if (debugArgIndex === -1) {
		execArgvPromise = Promise.resolve(execArgv);
	} else {
		execArgvPromise = getPort()
			.then(function (port) {
				execArgv[debugArgIndex] = '--debug-brk=' + port;
				return execArgv;
			});
	}

	return execArgvPromise
		.then(function (execArgv) {
			var result = fork(file, options, execArgv)
				.on('teardown', this._handleTeardown)
				.on('stats', this._handleStats)
				.on('test', this._handleTest)
				.on('unhandledRejections', this._handleRejections)
				.on('uncaughtException', this._handleExceptions)
				.on('stdout', this._handleOutput.bind(this, 'stdout'))
				.on('stderr', this._handleOutput.bind(this, 'stderr'));
			onForkStarting(result);
			return result.promise;
		}.bind(this));
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

Api.prototype._handleTeardown = function (data) {
	this.emit('dependencies', data.file, data.dependencies);
};

Api.prototype._handleStats = function (stats) {
	if (this.hasExclusive && !stats.hasExclusive) {
		return;
	}

	if (!this.hasExclusive && stats.hasExclusive) {
		this.hasExclusive = true;
		this.testCount = 0;
	}

	this.testCount += stats.testCount;
};

Api.prototype._handleTest = function (test) {
	test.title = this._prefixTitle(test.file) + test.title;

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

	this.emit('test', test);
};

Api.prototype._prefixTitle = function (file) {
	if (this.fileCount === 1 && !this.options.explicitTitles) {
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

Api.prototype.run = function (files) {
	var self = this;

	this._reset();
	return handlePaths(files, this.excludePatterns)
		.map(function (file) {
			return path.resolve(file);
		})
		.then(function (files) {
			if (files.length === 0) {
				self._handleExceptions({
					exception: new AvaError('Couldn\'t find any files to test'),
					file: undefined
				});

				return [];
			}

			var cacheEnabled = self.options.cacheEnabled !== false;
			var cacheDir = (cacheEnabled && findCacheDir({name: 'ava', files: files})) ||
				uniqueTempDir();

			self.options.cacheDir = cacheDir;
			self.precompiler = new CachingPrecompiler(cacheDir, self.options.babelConfig);
			self.fileCount = files.length;
			self.base = path.relative('.', commonPathPrefix(files)) + path.sep;

			return new Promise(function (resolve) {
				// receive test count from all files and then run the tests
				var statsCount = 0;

				var tests = new Array(files.length);
				files.forEach(function (file, index) {
					self._runFile(file, function (forkManager) {
						tests[index] = forkManager;
						forkManager.on('stats', tryRun);
					})
					.catch(function (error) {
						tests[index] = {
							run: function () {
								return this;
							},
							promise: Promise.reject(error),
							then: function () {
								return this.promise.then.apply(this.promise, arguments);
							}
						};
						tryRun();
					});
				});

				function tryRun() {
					if (++statsCount === self.fileCount) {
						self.emit('ready');

						var method = self.options.serial ? 'mapSeries' : 'map';
						var options = {
							runOnlyExclusive: self.hasExclusive
						};

						resolve(Promise[method](files, function (file, index) {
							return tests[index].run(options).promise.catch(function (err) {
								// The test failed catastrophically. Flag it up as an
								// exception, then return an empty result. Other tests may
								// continue to run.
								self._handleExceptions({
									exception: err,
									file: file
								});

								return {
									stats: {passCount: 0, skipCount: 0, todoCount: 0, failCount: 0},
									tests: []
								};
							});
						}));
					}
				}
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
			self.skipCount = sum(self.stats, 'skipCount');
			self.todoCount = sum(self.stats, 'todoCount');
			self.failCount = sum(self.stats, 'failCount');
		});
};

function handlePaths(files, excludePatterns) {
	// convert pinkie-promise to Bluebird promise
	files = Promise.resolve(globby(files.concat(excludePatterns)));

	return files
		.map(function (file) {
			if (fs.statSync(file).isDirectory()) {
				var pattern = path.join(file, '**', '*.js');
				if (process.platform === 'win32') {
					// Always use / in patterns, harmonizing matching across platforms.
					pattern = slash(pattern);
				}
				return handlePaths([pattern], excludePatterns);
			}

			// globby returns slashes even on Windows. Normalize here so the file
			// paths are consistently platform-accurate as tests are run.
			return path.normalize(file);
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
