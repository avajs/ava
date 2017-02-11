'use strict';
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const commonPathPrefix = require('common-path-prefix');
const uniqueTempDir = require('unique-temp-dir');
const findCacheDir = require('find-cache-dir');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash.debounce');
const autoBind = require('auto-bind');
const Promise = require('bluebird');
const getPort = require('get-port');
const arrify = require('arrify');
const ms = require('ms');
const CachingPrecompiler = require('./lib/caching-precompiler');
const RunStatus = require('./lib/run-status');
const AvaError = require('./lib/ava-error');
const AvaFiles = require('./lib/ava-files');
const fork = require('./lib/fork');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd(name);

		if (modulePath === null) {
			throw new Error(`Could not resolve required module '${name}'`);
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

class Api extends EventEmitter {
	constructor(options) {
		super();
		autoBind(this);

		this.options = Object.assign({match: []}, options);
		this.options.require = resolveModules(this.options.require);
	}
	_runFile(file, runStatus, execArgv) {
		const hash = this.precompiler.precompileFile(file);
		const precompiled = Object.assign({}, this._precompiledHelpers);
		const resolvedfpath = fs.realpathSync(file);
		precompiled[resolvedfpath] = hash;

		const options = Object.assign({}, this.options, {precompiled});
		const emitter = fork(file, options, execArgv);
		runStatus.observeFork(emitter);

		return emitter;
	}
	run(files, options) {
		return new AvaFiles({cwd: this.options.resolveTestsFrom, files})
			.findTestFiles()
			.then(files => this._run(files, options));
	}
	_onTimeout(runStatus) {
		const timeout = ms(this.options.timeout);
		const err = new AvaError(`Exited because no new tests completed within the last ${timeout}ms of inactivity`);
		this._handleError(runStatus, err);
		runStatus.emit('timeout');
	}
	_setupTimeout(runStatus) {
		const timeout = ms(this.options.timeout);

		runStatus._restartTimer = debounce(() => {
			this._onTimeout(runStatus);
		}, timeout);

		runStatus._restartTimer();
		runStatus.on('test', runStatus._restartTimer);
	}
	_cancelTimeout(runStatus) {
		runStatus._restartTimer.cancel();
	}
	_setupPrecompiler(files) {
		const isCacheEnabled = this.options.cacheEnabled !== false;
		let cacheDir = uniqueTempDir();

		if (isCacheEnabled) {
			const foundDir = findCacheDir({
				name: 'ava',
				files
			});
			if (foundDir !== null) {
				cacheDir = foundDir;
			}
		}

		this.options.cacheDir = cacheDir;

		const isPowerAssertEnabled = this.options.powerAssert !== false;
		this.precompiler = new CachingPrecompiler({
			path: cacheDir,
			babel: this.options.babelConfig,
			powerAssert: isPowerAssertEnabled
		});
	}
	_precompileHelpers() {
		this._precompiledHelpers = {};

		// Assumes the tests only load helpers from within the `resolveTestsFrom`
		// directory. Without arguments this is the `projectDir`, else it's
		// `process.cwd()` which may be nested too deeply. This will be solved
		// as we implement RFC 001 and move helper compilation into the worker
		// processes, avoiding the need for precompilation.
		return new AvaFiles({cwd: this.options.resolveTestsFrom})
			.findTestHelpers()
			.map(file => { // eslint-disable-line array-callback-return
				const hash = this.precompiler.precompileFile(file);
				this._precompiledHelpers[file] = hash;
			});
	}
	_run(files, options) {
		options = options || {};

		const runStatus = new RunStatus({
			runOnlyExclusive: options.runOnlyExclusive,
			prefixTitles: this.options.explicitTitles || files.length > 1,
			base: path.relative(process.cwd(), commonPathPrefix(files)) + path.sep,
			failFast: this.options.failFast
		});

		this.emit('test-run', runStatus, files);

		if (files.length === 0) {
			const err = new AvaError('Couldn\'t find any files to test');
			this._handleError(runStatus, err);
			return Promise.resolve(runStatus);
		}

		this._setupPrecompiler(files);

		return this._precompileHelpers()
			.then(() => {
				if (this.options.timeout) {
					this._setupTimeout(runStatus);
				}

				let overwatch;
				if (this.options.concurrency > 0) {
					const concurrency = this.options.serial ? 1 : this.options.concurrency;
					overwatch = this._runWithPool(files, runStatus, concurrency);
				} else {
					// _runWithoutPool exists to preserve legacy behavior, specifically around `.only`
					overwatch = this._runWithoutPool(files, runStatus);
				}

				return overwatch;
			});
	}
	_computeForkExecArgs(files) {
		const execArgv = this.options.testOnlyExecArgv || process.execArgv;
		let debugArgIndex = -1;

		// --debug-brk is used in addition to --inspect to break on first line and wait
		execArgv.some((arg, index) => {
			const isDebugArg = arg === '--inspect' || arg.indexOf('--inspect=') === 0;
			if (isDebugArg) {
				debugArgIndex = index;
			}

			return isDebugArg;
		});

		const isInspect = debugArgIndex >= 0;
		if (!isInspect) {
			execArgv.some((arg, index) => {
				const isDebugArg = arg === '--debug' || arg === '--debug-brk' || arg.indexOf('--debug-brk=') === 0 || arg.indexOf('--debug=') === 0;
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
			.map(port => {
				const forkExecArgv = execArgv.slice();
				let flagName = isInspect ? '--inspect' : '--debug';
				const oldValue = forkExecArgv[debugArgIndex];
				if (oldValue.indexOf('brk') > 0) {
					flagName += '-brk';
				}

				forkExecArgv[debugArgIndex] = `${flagName}=${port}`;

				return forkExecArgv;
			});
	}
	_handleError(runStatus, err) {
		runStatus.handleExceptions({
			exception: err,
			file: err.file ? path.relative(process.cwd(), err.file) : undefined
		});
	}
	_runWithoutPool(files, runStatus) {
		const tests = [];
		let execArgvList;

		// TODO: This should be cleared at the end of the run
		runStatus.on('timeout', () => {
			tests.forEach(fork => {
				fork.exit();
			});
		});

		return this._computeForkExecArgs(files)
			.then(argvList => {
				execArgvList = argvList;
			})
			.return(files)
			.each((file, index) => {
				return new Promise(resolve => {
					const forkArgs = execArgvList[index];
					const test = this._runFile(file, runStatus, forkArgs);
					tests.push(test);
					test.on('stats', resolve);
					test.catch(resolve);
				}).catch(err => {
					err.results = [];
					err.file = file;
					return Promise.reject(err);
				});
			})
			.then(() => {
				if (this.options.match.length > 0 && !runStatus.hasExclusive) {
					const err = new AvaError('Couldn\'t find any matching tests');
					err.file = undefined;
					err.results = [];
					return Promise.reject(err);
				}

				const method = this.options.serial ? 'mapSeries' : 'map';
				const options = {
					runOnlyExclusive: runStatus.hasExclusive
				};

				return Promise[method](files, (file, index) => {
					return tests[index].run(options).catch(err => {
						err.file = file;
						this._handleError(runStatus, err);
						return getBlankResults();
					});
				});
			})
			.catch(err => {
				this._handleError(runStatus, err);
				return err.results;
			})
			.tap(results => {
				// If no tests ran, make sure to tear down the child processes
				if (results.length === 0) {
					tests.forEach(test => {
						test.send('teardown');
					});
				}
			})
			.then(results => {
				// Cancel debounced _onTimeout() from firing
				if (this.options.timeout) {
					this._cancelTimeout(runStatus);
				}

				runStatus.processResults(results);

				return runStatus;
			});
	}
	_runWithPool(files, runStatus, concurrency) {
		const tests = [];
		let execArgvList;

		runStatus.on('timeout', () => {
			tests.forEach(fork => {
				fork.exit();
			});
		});

		return this._computeForkExecArgs(files)
			.then(argvList => {
				execArgvList = argvList;
			})
			.return(files)
			.map((file, index) => {
				return new Promise(resolve => {
					const forkArgs = execArgvList[index];
					const test = this._runFile(file, runStatus, forkArgs);
					tests.push(test);

					// If we're looking for matches, run every single test process in exclusive-only mode
					const options = {
						runOnlyExclusive: this.options.match.length > 0
					};

					resolve(test.run(options));
				}).catch(err => {
					err.file = file;
					this._handleError(runStatus, err);
					return getBlankResults();
				});
			}, {concurrency})
			.then(results => {
				// Filter out undefined results (usually result of caught exceptions)
				results = results.filter(Boolean);

				// Cancel debounced _onTimeout() from firing
				if (this.options.timeout) {
					this._cancelTimeout(runStatus);
				}

				if (this.options.match.length > 0 && !runStatus.hasExclusive) {
					results = [];

					const err = new AvaError('Couldn\'t find any matching tests');
					this._handleError(runStatus, err);
				}

				runStatus.processResults(results);

				return runStatus;
			});
	}
}

module.exports = Api;
