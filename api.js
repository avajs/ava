'use strict';
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os');
const commonPathPrefix = require('common-path-prefix');
const uniqueTempDir = require('unique-temp-dir');
const isCi = require('is-ci');
const resolveCwd = require('resolve-cwd');
const debounce = require('lodash.debounce');
const Bluebird = require('bluebird');
const getPort = require('get-port');
const arrify = require('arrify');
const ms = require('ms');
const babelConfigHelper = require('./lib/babel-config');
const CachingPrecompiler = require('./lib/caching-precompiler');
const RunStatus = require('./lib/run-status');
const AvaError = require('./lib/ava-error');
const AvaFiles = require('./lib/ava-files');
const fork = require('./lib/fork');

function resolveModules(modules) {
	return arrify(modules).map(name => {
		const modulePath = resolveCwd.silent(name);

		if (modulePath === null) {
			throw new Error(`Could not resolve required module '${name}'`);
		}

		return modulePath;
	});
}

class Api extends EventEmitter {
	constructor(options) {
		super();

		this.options = Object.assign({match: []}, options);
		this.options.require = resolveModules(this.options.require);
	}

	run(files, runtimeOptions) {
		const apiOptions = this.options;
		runtimeOptions = runtimeOptions || {};

		// Each run will have its own status. It can only be created when test files
		// have been found.
		let runStatus;

		// Irrespectively, perform some setup now, before finding test files.
		const handleError = exception => {
			runStatus.handleExceptions({
				exception,
				file: exception.file ? path.relative(process.cwd(), exception.file) : undefined
			});
		};

		// Track active forks and manage timeouts.
		const failFast = apiOptions.failFast === true;
		let bailed = false;
		const pendingForks = new Set();
		let restartTimer;
		if (apiOptions.timeout) {
			const timeout = ms(apiOptions.timeout);

			restartTimer = debounce(() => {
				// If failFast is active, prevent new test files from running after
				// the current ones are exited.
				if (failFast) {
					bailed = true;
				}

				for (const fork of pendingForks) {
					fork.exit();
				}

				handleError(new AvaError(`Exited because no new tests completed within the last ${timeout}ms of inactivity`));
			}, timeout);
		} else {
			restartTimer = Object.assign(() => {}, {cancel() {}});
		}

		// Find all test files.
		return new AvaFiles({cwd: apiOptions.resolveTestsFrom, files}).findTestFiles()
			.then(files => {
				runStatus = new RunStatus({
					runOnlyExclusive: runtimeOptions.runOnlyExclusive,
					prefixTitles: apiOptions.explicitTitles || files.length > 1,
					base: path.relative(process.cwd(), commonPathPrefix(files)) + path.sep,
					failFast,
					updateSnapshots: runtimeOptions.updateSnapshots
				});

				runStatus.on('test', restartTimer);
				if (failFast) {
					// Prevent new test files from running once a test has failed.
					runStatus.on('test', test => {
						if (test.error) {
							bailed = true;
						}
					});
				}

				this.emit('test-run', runStatus, files);

				// Bail out early if no files were found.
				if (files.length === 0) {
					handleError(new AvaError('Couldn\'t find any files to test'));
					return runStatus;
				}

				// Set up a fresh precompiler for each test run.
				return this._setupPrecompiler()
					.then(precompilation => {
						if (!precompilation) {
							return null;
						}

						// Compile all test and helper files. Assumes the tests only load
						// helpers from within the `resolveTestsFrom` directory. Without
						// arguments this is the `projectDir`, else it's `process.cwd()`
						// which may be nested too deeply.
						return new AvaFiles({cwd: this.options.resolveTestsFrom}).findTestHelpers().then(helpers => {
							return {
								cacheDir: precompilation.cacheDir,
								map: files.concat(helpers).reduce((acc, file) => {
									try {
										const realpath = fs.realpathSync(file);
										const hash = precompilation.precompiler.precompileFile(realpath);
										acc[realpath] = hash;
									} catch (err) {
										throw Object.assign(err, {file});
									}
									return acc;
								}, {})
							};
						});
					})
					.then(precompilation => {
						// Resolve the correct concurrency value.
						let concurrency = Math.min(os.cpus().length, isCi ? 2 : Infinity);
						if (apiOptions.concurrency > 0) {
							concurrency = apiOptions.concurrency;
						}
						if (apiOptions.serial) {
							concurrency = 1;
						}

						// Try and run each file, limited by `concurrency`.
						return Bluebird.map(files, file => {
							// No new files should be run once a test has timed out or failed,
							// and failFast is enabled.
							if (bailed) {
								return null;
							}

							let forked;
							return Bluebird.resolve(
								this._computeForkExecArgv().then(execArgv => {
									const options = Object.assign({}, apiOptions, {
										// If we're looking for matches, run every single test process in exclusive-only mode
										runOnlyExclusive: apiOptions.match.length > 0 || runtimeOptions.runOnlyExclusive === true
									});
									if (precompilation) {
										options.cacheDir = precompilation.cacheDir;
										options.precompiled = precompilation.map;
									} else {
										options.precompiled = {};
									}
									if (runtimeOptions.updateSnapshots) {
										// Don't use in Object.assign() since it'll override options.updateSnapshots even when false.
										options.updateSnapshots = true;
									}

									forked = fork(file, options, execArgv);
									pendingForks.add(forked);
									runStatus.observeFork(forked);
									restartTimer();
									return forked;
								}).catch(err => {
									// Prevent new test files from running.
									if (failFast) {
										bailed = true;
									}
									handleError(Object.assign(err, {file}));
									return null;
								})
							).finally(() => {
								pendingForks.delete(forked);
							});
						}, {concurrency});
					})
					.catch(err => {
						handleError(err);
						return [];
					})
					.then(results => {
						restartTimer.cancel();

						// Filter out undefined results (e.g. for files that were skipped after a timeout)
						results = results.filter(Boolean);
						if (apiOptions.match.length > 0 && !runStatus.hasExclusive) {
							handleError(new AvaError('Couldn\'t find any matching tests'));
						}

						runStatus.processResults(results);
						return runStatus;
					});
			});
	}

	_setupPrecompiler() {
		const cacheDir = this.options.cacheEnabled === false ?
			uniqueTempDir() :
			path.join(this.options.projectDir, 'node_modules', '.cache', 'ava');

		const compileEnhancements = this.options.compileEnhancements !== false;
		return babelConfigHelper.build(this.options.projectDir, cacheDir, this.options.babelConfig, compileEnhancements)
			.then(result => {
				return result ? {
					cacheDir,
					precompiler: new CachingPrecompiler({
						path: cacheDir,
						getBabelOptions: result.getOptions,
						babelCacheKeys: result.cacheKeys
					})
				} : null;
			});
	}

	_computeForkExecArgv() {
		const execArgv = this.options.testOnlyExecArgv || process.execArgv;
		if (execArgv.length === 0) {
			return Promise.resolve(execArgv);
		}

		let debugArgIndex = -1;

		// --inspect-brk is used in addition to --inspect to break on first line and wait
		execArgv.some((arg, index) => {
			const isDebugArg = /^--inspect(-brk)?($|=)/.test(arg);
			if (isDebugArg) {
				debugArgIndex = index;
			}

			return isDebugArg;
		});

		const isInspect = debugArgIndex >= 0;
		if (!isInspect) {
			execArgv.some((arg, index) => {
				const isDebugArg = /^--debug(-brk)?($|=)/.test(arg);
				if (isDebugArg) {
					debugArgIndex = index;
				}

				return isDebugArg;
			});
		}

		if (debugArgIndex === -1) {
			return Promise.resolve(execArgv);
		}

		return getPort().then(port => {
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
}

module.exports = Api;
