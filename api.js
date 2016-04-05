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
var debounce = require('lodash.debounce');
var slash = require('slash');
var isObj = require('is-obj');
var ms = require('ms');
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
	this.options.match = this.options.match || [];
	this.options.require = (this.options.require || []).map(function (moduleId) {
		var ret = resolveCwd(moduleId);
		if (ret === null) {
			throw new Error('Could not resolve required module \'' + moduleId + '\'');
		}

		return ret;
	});

	this.excludePatterns = [
		'!**/node_modules/**',
		'!**/fixtures/**',
		'!**/helpers/**'
	];

	Object.keys(Api.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);

	this._reset();

	if (this.options.timeout) {
		var timeout = ms(this.options.timeout);
		this._restartTimer = debounce(this._onTimeout, timeout);
	}
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

Api.prototype._runFile = function (file) {
	var hash = this.precompiler.precompileFile(file);
	var precompiled = {};
	precompiled[file] = hash;

	var options = objectAssign({}, this.options, {
		precompiled: precompiled
	});

	return fork(file, options)
		.on('teardown', this._handleTeardown)
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

function normalizeError(err) {
	if (!isObj(err)) {
		err = {
			message: err,
			stack: err
		};
	}

	return err;
}

Api.prototype._handleRejections = function (data) {
	this.rejectionCount += data.rejections.length;

	data.rejections.forEach(function (err) {
		err = normalizeError(err);
		err.type = 'rejection';
		err.file = data.file;
		this.emit('error', err);
		this.errors.push(err);
	}, this);
};

Api.prototype._handleExceptions = function (data) {
	this.exceptionCount++;
	var err = normalizeError(data.exception);
	err.type = 'exception';
	err.file = data.file;
	this.emit('error', err);
	this.errors.push(err);
};

Api.prototype._handleTeardown = function (data) {
	this.emit('dependencies', data.file, data.dependencies);
};

Api.prototype._handleStats = function (stats) {
	this.emit('stats', stats);

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

Api.prototype._onTimeout = function () {
	var timeout = ms(this.options.timeout);
	var message = 'Exited because no new tests completed within the last ' + timeout + 'ms of inactivity';

	this._handleExceptions({
		exception: new AvaError(message),
		file: null
	});

	this.emit('timeout');
};

Api.prototype.run = function (files, options) {
	var self = this;

	this._reset();

	if (options && options.runOnlyExclusive) {
		this.hasExclusive = true;
	}

	if (this.options.timeout) {
		this._restartTimer();
		this.on('test', this._restartTimer);
	}

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

			var tests = new Array(self.fileCount);

			self.on('timeout', function () {
				tests.forEach(function (fork) {
					fork.exit();
				});
			});

			return new Promise(function (resolve) {
				function run() {
					if (self.options.match.length > 0 && !self.hasExclusive) {
						self._handleExceptions({
							exception: new AvaError('Couldn\'t find any matching tests'),
							file: undefined
						});

						resolve([]);
						return;
					}

					self.emit('ready');

					var method = self.options.serial ? 'mapSeries' : 'map';
					var options = {
						runOnlyExclusive: self.hasExclusive
					};

					resolve(Promise[method](files, function (file, index) {
						return tests[index].run(options).catch(function (err) {
							// The test failed catastrophically. Flag it up as an
							// exception, then return an empty result. Other tests may
							// continue to run.
							self._handleExceptions({
								exception: err,
								file: file
							});

							return {
								stats: {
									passCount: 0,
									skipCount: 0,
									todoCount: 0,
									failCount: 0
								},
								tests: []
							};
						});
					}));
				}

				// receive test count from all files and then run the tests
				var unreportedFiles = self.fileCount;
				var bailed = false;

				files.every(function (file, index) {
					var tried = false;

					function tryRun() {
						if (!tried && !bailed) {
							tried = true;
							unreportedFiles--;

							if (unreportedFiles === 0) {
								run();
							}
						}
					}

					try {
						var test = tests[index] = self._runFile(file);

						test.on('stats', tryRun);
						test.catch(tryRun);

						return true;
					} catch (err) {
						bailed = true;

						self._handleExceptions({
							exception: err,
							file: file
						});

						resolve([]);

						return false;
					}
				});
			}).then(function (results) {
				if (results.length === 0) {
					// No tests ran, make sure to tear down the child processes.
					tests.forEach(function (test) {
						test.send('teardown');
					});
				}

				return results;
			});
		})
		.then(function (results) {
			// cancel debounced _onTimeout() from firing
			if (self.options.timeout) {
				self._restartTimer.cancel();
			}

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
