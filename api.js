'use strict';
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var util = require('util');
var commonPathPrefix = require('common-path-prefix');
var uniqueTempDir = require('unique-temp-dir');
var findCacheDir = require('find-cache-dir');
var objectAssign = require('object-assign');
var resolveCwd = require('resolve-cwd');
var debounce = require('lodash.debounce');
var AvaFiles = require('ava-files');
var autoBind = require('auto-bind');
var Promise = require('bluebird');
var getPort = require('get-port');
var arrify = require('arrify');
var ms = require('ms');
var CachingPrecompiler = require('./lib/caching-precompiler');
var RunStatus = require('./lib/run-status');
var AvaError = require('./lib/ava-error');
var fork = require('./lib/fork');

function resolveModules(modules) {
	return arrify(modules).map(function (name) {
		var modulePath = resolveCwd(name);
		if (modulePath === null) {
			throw new Error('Could not resolve required module \'' + name + '\'');
		}

		return modulePath;
	});
}

function getBlankResults() {
	return {
		stats: {
			knownFailureCount: 0,
			testCount: 0,
			passCount: 0,
			skipCount: 0,
			todoCount: 0,
			failCount: 0
		},
		tests: []
	};
}

function Api(options) {
	if (!(this instanceof Api)) {
		throw new TypeError('Class constructor Api cannot be invoked without \'new\'');
	}

	EventEmitter.call(this);
	autoBind(this);

	this.options = objectAssign({
		cwd: process.cwd(),
		resolveTestsFrom: process.cwd(),
		match: []
	}, options);

	this.options.require = resolveModules(this.options.require);
}

util.inherits(Api, EventEmitter);
module.exports = Api;

Api.prototype._runFile = function (file, runStatus, execArgv) {
	var hash = this.precompiler.precompileFile(file);
	var precompiled = {};
	precompiled[file] = hash;

	var options = objectAssign({}, this.options, {
		precompiled: precompiled
	});

	var emitter = fork(file, options, execArgv);
	runStatus.observeFork(emitter);

	return emitter;
};

Api.prototype.run = function (files, options) {
	var self = this;

	return new AvaFiles({cwd: this.options.resolveTestsFrom, files: files})
		.findTestFiles()
		.then(function (files) {
			return self._run(files, options);
		});
};

Api.prototype._onTimeout = function (runStatus) {
	var timeout = ms(this.options.timeout);
	var err = new AvaError('Exited because no new tests completed within the last ' + timeout + 'ms of inactivity');
	this._handleError(runStatus, err);

	runStatus.emit('timeout');
};

Api.prototype._setupTimeout = function (runStatus) {
	var self = this;
	var timeout = ms(this.options.timeout);

	runStatus._restartTimer = debounce(function () {
		self._onTimeout(runStatus);
	}, timeout);

	runStatus._restartTimer();
	runStatus.on('test', runStatus._restartTimer);
};

Api.prototype._cancelTimeout = function (runStatus) {
	runStatus._restartTimer.cancel();
};

Api.prototype._setupPrecompiler = function (files) {
	var isCacheEnabled = this.options.cacheEnabled !== false;
	var cacheDir = uniqueTempDir();

	if (isCacheEnabled) {
		var foundDir = findCacheDir({
			name: 'ava',
			files: files
		});
		if (foundDir !== null) {
			cacheDir = foundDir;
		}
	}

	this.options.cacheDir = cacheDir;

	var isPowerAssertEnabled = this.options.powerAssert !== false;
	this.precompiler = new CachingPrecompiler({
		path: cacheDir,
		babel: this.options.babelConfig,
		powerAssert: isPowerAssertEnabled
	});
};

Api.prototype._run = function (files, options) {
	options = options || {};

	var runStatus = new RunStatus({
		runOnlyExclusive: options.runOnlyExclusive,
		prefixTitles: this.options.explicitTitles || files.length > 1,
		base: path.relative('.', commonPathPrefix(files)) + path.sep
	});

	this.emit('test-run', runStatus, files);

	if (files.length === 0) {
		var err = new AvaError('Couldn\'t find any files to test');
		this._handleError(runStatus, err);

		return Promise.resolve(runStatus);
	}

	this._setupPrecompiler(files);

	if (this.options.timeout) {
		this._setupTimeout(runStatus);
	}

	var overwatch;
	if (this.options.concurrency > 0) {
		var concurrency = this.options.serial ? 1 : this.options.concurrency;
		overwatch = this._runWithPool(files, runStatus, concurrency);
	} else {
		// _runWithoutPool exists to preserve legacy behavior, specifically around `.only`
		overwatch = this._runWithoutPool(files, runStatus);
	}

	return overwatch;
};

Api.prototype._computeForkExecArgs = function (files) {
	var execArgv = this.options.testOnlyExecArgv || process.execArgv;
	var debugArgIndex = -1;

	// --debug-brk is used in addition to --inspect to break on first line and wait
	execArgv.some(function (arg, index) {
		var isDebugArg = arg === '--inspect' || arg.indexOf('--inspect=') === 0;
		if (isDebugArg) {
			debugArgIndex = index;
		}

		return isDebugArg;
	});

	var isInspect = debugArgIndex >= 0;
	if (!isInspect) {
		execArgv.some(function (arg, index) {
			var isDebugArg = arg === '--debug' || arg === '--debug-brk' || arg.indexOf('--debug-brk=') === 0 || arg.indexOf('--debug=') === 0;
			if (isDebugArg) {
				debugArgIndex = index;
			}

			return isDebugArg;
		});
	}

	if (debugArgIndex === -1) {
		return Promise.resolve([]);
	}

	return Promise
		.map(files, getPort)
		.map(function (port) {
			var forkExecArgv = execArgv.slice();
			var flagName = isInspect ? '--inspect' : '--debug';
			var oldValue = forkExecArgv[debugArgIndex];
			if (oldValue.indexOf('brk') > 0) {
				flagName += '-brk';
			}

			forkExecArgv[debugArgIndex] = flagName + '=' + port;

			return forkExecArgv;
		});
};

Api.prototype._handleError = function (runStatus, err) {
	runStatus.handleExceptions({
		exception: err,
		file: err.file ? path.relative('.', err.file) : undefined
	});
};

Api.prototype._runWithoutPool = function (files, runStatus) {
	var self = this;

	var tests = [];
	var execArgvList;

	// TODO: this should be cleared at the end of the run
	runStatus.on('timeout', function () {
		tests.forEach(function (fork) {
			fork.exit();
		});
	});

	return this._computeForkExecArgs(files)
		.then(function (argvList) {
			execArgvList = argvList;
		})
		.return(files)
		.each(function (file, index) {
			return new Promise(function (resolve) {
				var forkArgs = execArgvList[index];
				var test = self._runFile(file, runStatus, forkArgs);
				tests.push(test);

				test.on('stats', resolve);
				test.catch(resolve);
			}).catch(function (err) {
				err.results = [];
				err.file = file;
				return Promise.reject(err);
			});
		})
		.then(function () {
			if (self.options.match.length > 0 && !runStatus.hasExclusive) {
				var err = new AvaError('Couldn\'t find any matching tests');
				err.file = undefined;
				err.results = [];

				return Promise.reject(err);
			}

			var method = self.options.serial ? 'mapSeries' : 'map';
			var options = {
				runOnlyExclusive: runStatus.hasExclusive
			};

			return Promise[method](files, function (file, index) {
				return tests[index].run(options).catch(function (err) {
					err.file = file;
					self._handleError(runStatus, err);

					return getBlankResults();
				});
			});
		})
		.catch(function (err) {
			self._handleError(runStatus, err);

			return err.results;
		})
		.tap(function (results) {
			// if no tests ran, make sure to tear down the child processes
			if (results.length === 0) {
				tests.forEach(function (test) {
					test.send('teardown');
				});
			}
		})
		.then(function (results) {
			// cancel debounced _onTimeout() from firing
			if (self.options.timeout) {
				self._cancelTimeout(runStatus);
			}

			runStatus.processResults(results);

			return runStatus;
		});
};

Api.prototype._runWithPool = function (files, runStatus, concurrency) {
	var self = this;

	var tests = [];
	var execArgvList;

	runStatus.on('timeout', function () {
		tests.forEach(function (fork) {
			fork.exit();
		});
	});

	return this._computeForkExecArgs(files)
		.then(function (argvList) {
			execArgvList = argvList;
		})
		.return(files)
		.map(function (file, index) {
			return new Promise(function (resolve) {
				var forkArgs = execArgvList[index];
				var test = self._runFile(file, runStatus, forkArgs);
				tests.push(test);

				// If we're looking for matches, run every single test process in exclusive-only mode
				var options = {
					runOnlyExclusive: self.options.match.length > 0
				};

				resolve(test.run(options));
			}).catch(function (err) {
				err.file = file;
				self._handleError(runStatus, err);

				return getBlankResults();
			});
		}, {concurrency: concurrency})
		.then(function (results) {
			// Filter out undefined results (usually result of caught exceptions)
			results = results.filter(Boolean);

			// cancel debounced _onTimeout() from firing
			if (self.options.timeout) {
				self._cancelTimeout(runStatus);
			}

			if (self.options.match.length > 0 && !runStatus.hasExclusive) {
				results = [];

				var err = new AvaError('Couldn\'t find any matching tests');
				self._handleError(runStatus, err);
			}

			runStatus.processResults(results);

			return runStatus;
		});
};
