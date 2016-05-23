'use strict';
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');
var Promise = require('bluebird');
var objectAssign = require('object-assign');
var commonPathPrefix = require('common-path-prefix');
var resolveCwd = require('resolve-cwd');
var uniqueTempDir = require('unique-temp-dir');
var findCacheDir = require('find-cache-dir');
var debounce = require('lodash.debounce');
var ms = require('ms');
var AvaError = require('./lib/ava-error');
var fork = require('./lib/fork');
var CachingPrecompiler = require('./lib/caching-precompiler');
var AvaFiles = require('./lib/ava-files');
var RunStatus = require('./lib/run-status');

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

	Object.keys(Api.prototype).forEach(function (key) {
		this[key] = this[key].bind(this);
	}, this);
}

util.inherits(Api, EventEmitter);
module.exports = Api;

Api.prototype._runFile = function (file, runStatus) {
	var hash = this.precompiler.precompileFile(file);
	var precompiled = {};
	precompiled[file] = hash;

	var options = objectAssign({}, this.options, {
		precompiled: precompiled
	});

	var emitter = fork(file, options);

	runStatus.observeFork(emitter);

	return emitter;
};

Api.prototype._onTimeout = function (runStatus) {
	var timeout = ms(this.options.timeout);
	var message = 'Exited because no new tests completed within the last ' + timeout + 'ms of inactivity';

	runStatus.handleExceptions({
		exception: new AvaError(message),
		file: undefined
	});

	runStatus.emit('timeout');
};

Api.prototype.run = function (files, options) {
	var self = this;

	return new AvaFiles(files)
		.findTestFiles()
		.then(function (files) {
			return self._run(files, options);
		});
};

Api.prototype._run = function (files, _options) {
	var self = this;
	var runStatus = new RunStatus({
		prefixTitles: this.options.explicitTitles || files.length > 1,
		runOnlyExclusive: _options && _options.runOnlyExclusive,
		base: path.relative('.', commonPathPrefix(files)) + path.sep
	});

	if (self.options.timeout) {
		var timeout = ms(self.options.timeout);
		runStatus._restartTimer = debounce(function () {
			self._onTimeout(runStatus);
		}, timeout);
		runStatus._restartTimer();
		runStatus.on('test', runStatus._restartTimer);
	}

	self.emit('test-run', runStatus, files);

	if (files.length === 0) {
		runStatus.handleExceptions({
			exception: new AvaError('Couldn\'t find any files to test'),
			file: undefined
		});

		return Promise.resolve(runStatus);
	}

	var cacheEnabled = self.options.cacheEnabled !== false;
	var cacheDir = (cacheEnabled && findCacheDir({name: 'ava', files: files})) ||
		uniqueTempDir();

	self.options.cacheDir = cacheDir;
	self.precompiler = new CachingPrecompiler(cacheDir, self.options.babelConfig);
	self.fileCount = files.length;

	var overwatch;
	if (this.options.concurrency > 0) {
		overwatch = this._runLimitedPool(files, runStatus, self.options.serial ? 1 : this.options.concurrency);
	} else {
		// _runNoPool exists to preserve legacy behavior, specifically around `.only`
		overwatch = this._runNoPool(files, runStatus);
	}

	return overwatch;
};

Api.prototype._runNoPool = function (files, runStatus) {
	var self = this;
	var tests = new Array(self.fileCount);

	// TODO: thid should be cleared at the end of the run
	runStatus.on('timeout', function () {
		tests.forEach(function (fork) {
			fork.exit();
		});
	});

	return new Promise(function (resolve) {
		function run() {
			if (self.options.match.length > 0 && !runStatus.hasExclusive) {
				runStatus.handleExceptions({
					exception: new AvaError('Couldn\'t find any matching tests'),
					file: undefined
				});

				resolve([]);
				return;
			}

			var method = self.options.serial ? 'mapSeries' : 'map';
			var options = {
				runOnlyExclusive: runStatus.hasExclusive
			};

			resolve(Promise[method](files, function (file, index) {
				return tests[index].run(options).catch(function (err) {
					// The test failed catastrophically. Flag it up as an
					// exception, then return an empty result. Other tests may
					// continue to run.
					runStatus.handleExceptions({
						exception: err,
						file: path.relative('.', file)
					});

					return getBlankResults();
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
				var test = tests[index] = self._runFile(file, runStatus);

				test.on('stats', tryRun);
				test.catch(tryRun);

				return true;
			} catch (err) {
				bailed = true;

				runStatus.handleExceptions({
					exception: err,
					file: path.relative('.', file)
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
	}).then(function (results) {
		// cancel debounced _onTimeout() from firing
		if (self.options.timeout) {
			runStatus._restartTimer.cancel();
		}

		runStatus.processResults(results);
		return runStatus;
	});
};

function getBlankResults() {
	return {
		stats: {
			testCount: 0,
			passCount: 0,
			knownFailureCount: 0,
			skipCount: 0,
			todoCount: 0,
			failCount: 0
		},
		tests: []
	};
}

Api.prototype._runLimitedPool = function (files, runStatus, concurrency) {
	var self = this;
	var tests = {};

	runStatus.on('timeout', function () {
		Object.keys(tests).forEach(function (file) {
			var fork = tests[file];
			fork.exit();
		});
	});

	return Promise.map(files, function (file) {
		var handleException = function (err) {
			runStatus.handleExceptions({
				exception: err,
				file: path.relative('.', file)
			});
		};

		try {
			var test = tests[file] = self._runFile(file, runStatus);

			return new Promise(function (resolve, reject) {
				var runner = function () {
					var options = {
						// If we're looking for matches, run every single test process in exclusive-only mode
						runOnlyExclusive: self.options.match.length > 0
					};
					test.run(options)
						.then(resolve)
						.catch(reject);
				};

				test.on('stats', runner);
				test.on('exit', function () {
					delete tests[file];
				});
				test.catch(runner);
			}).catch(handleException);
		} catch (err) {
			handleException(err);
		}
	}, {concurrency: concurrency})
		.then(function (results) {
			// Filter out undefined results (usually result of caught exceptions)
			results = results.filter(Boolean);

			// cancel debounced _onTimeout() from firing
			if (self.options.timeout) {
				runStatus._restartTimer.cancel();
			}

			if (self.options.match.length > 0 && !runStatus.hasExclusive) {
				// Ensure results are empty
				results = [];
				runStatus.handleExceptions({
					exception: new AvaError('Couldn\'t find any matching tests'),
					file: undefined
				});
			}

			runStatus.processResults(results);
			return runStatus;
		});
};
