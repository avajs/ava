'use strict';
const nodePath = require('path');
const debug = require('debug')('ava:watcher');
const diff = require('lodash.difference');
const chokidar = require('chokidar');
const flatten = require('arr-flatten');
const union = require('array-union');
const uniq = require('array-uniq');
const AvaFiles = require('./ava-files');

function rethrowAsync(err) {
	// Don't swallow exceptions. Note that any
	// expected error should already have been logged
	setImmediate(() => {
		throw err;
	});
}

const MIN_DEBOUNCE_DELAY = 10;
const INITIAL_DEBOUNCE_DELAY = 100;

class Debouncer {
	constructor(watcher) {
		this.watcher = watcher;
		this.timer = null;
		this.repeat = false;
	}

	debounce(delay) {
		if (this.timer) {
			this.again = true;
			return;
		}

		delay = delay ? Math.max(delay, MIN_DEBOUNCE_DELAY) : INITIAL_DEBOUNCE_DELAY;

		const timer = setTimeout(() => {
			this.watcher.busy.then(() => {
				// Do nothing if debouncing was canceled while waiting for the busy
				// promise to fulfil
				if (this.timer !== timer) {
					return;
				}

				if (this.again) {
					this.timer = null;
					this.again = false;
					this.debounce(delay / 2);
				} else {
					this.watcher.runAfterChanges();
					this.timer = null;
					this.again = false;
				}
			});
		}, delay);

		this.timer = timer;
	}

	cancel() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
			this.again = false;
		}
	}
}

class TestDependency {
	constructor(file, sources) {
		this.file = file;
		this.sources = sources;
	}

	contains(source) {
		return this.sources.indexOf(source) !== -1;
	}
}

class Watcher {
	constructor(logger, api, files, sources) {
		this.debouncer = new Debouncer(this);
		this.avaFiles = new AvaFiles({
			files,
			sources
		});

		this.clearLogOnNextRun = true;
		this.runVector = 0;
		this.previousFiles = files;
		this.run = (specificFiles, updateSnapshots) => {
			if (this.runVector > 0) {
				const cleared = this.clearLogOnNextRun && logger.clear();
				if (!cleared) {
					logger.reset();
					logger.section();
				}
				this.clearLogOnNextRun = true;

				logger.reset();
				logger.start();
			}

			this.runVector += 1;

			const currentVector = this.runVector;

			let runOnlyExclusive = false;

			if (specificFiles) {
				const exclusiveFiles = specificFiles.filter(file => this.filesWithExclusiveTests.indexOf(file) !== -1);

				runOnlyExclusive = exclusiveFiles.length !== this.filesWithExclusiveTests.length;

				if (runOnlyExclusive) {
					// The test files that previously contained exclusive tests are always
					// run, together with the remaining specific files.
					const remainingFiles = diff(specificFiles, exclusiveFiles);
					specificFiles = this.filesWithExclusiveTests.concat(remainingFiles);
				}
			}

			this.touchedFiles.clear();
			this.previousFiles = specificFiles || files;
			this.busy = api.run(this.previousFiles, {runOnlyExclusive, updateSnapshots: updateSnapshots === true})
				.then(runStatus => {
					runStatus.previousFailCount = this.sumPreviousFailures(currentVector);
					logger.finish(runStatus);

					const badCounts = runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount;
					this.clearLogOnNextRun = this.clearLogOnNextRun && badCounts === 0;
				})
				.catch(rethrowAsync);
		};

		this.testDependencies = [];
		this.trackTestDependencies(api, sources);

		this.touchedFiles = new Set();
		this.trackTouchedFiles(api);

		this.filesWithExclusiveTests = [];
		this.trackExclusivity(api);

		this.filesWithFailures = [];
		this.trackFailures(api);

		this.dirtyStates = {};
		this.watchFiles();
		this.rerunAll();
	}

	watchFiles() {
		const patterns = this.avaFiles.getChokidarPatterns();

		chokidar.watch(patterns.paths, {
			ignored: patterns.ignored,
			ignoreInitial: true
		}).on('all', (event, path) => {
			if (event === 'add' || event === 'change' || event === 'unlink') {
				debug('Detected %s of %s', event, path);
				this.dirtyStates[path] = event;
				this.debouncer.debounce();
			}
		});
	}

	trackTestDependencies(api) {
		const relative = absPath => nodePath.relative(process.cwd(), absPath);

		api.on('test-run', runStatus => {
			runStatus.on('dependencies', (file, dependencies) => {
				const sourceDeps = dependencies.map(x => relative(x)).filter(this.avaFiles.isSource);
				this.updateTestDependencies(file, sourceDeps);
			});
		});
	}

	updateTestDependencies(file, sources) {
		if (sources.length === 0) {
			this.testDependencies = this.testDependencies.filter(dep => dep.file !== file);
			return;
		}

		const isUpdate = this.testDependencies.some(dep => {
			if (dep.file !== file) {
				return false;
			}

			dep.sources = sources;

			return true;
		});

		if (!isUpdate) {
			this.testDependencies.push(new TestDependency(file, sources));
		}
	}

	trackTouchedFiles(api) {
		api.on('test-run', runStatus => {
			runStatus.on('touchedFiles', files => {
				for (const file of files) {
					this.touchedFiles.add(nodePath.relative(process.cwd(), file));
				}
			});
		});
	}

	trackExclusivity(api) {
		api.on('stats', stats => {
			this.updateExclusivity(stats.file, stats.hasExclusive);
		});
	}

	updateExclusivity(file, hasExclusiveTests) {
		const index = this.filesWithExclusiveTests.indexOf(file);

		if (hasExclusiveTests && index === -1) {
			this.filesWithExclusiveTests.push(file);
		} else if (!hasExclusiveTests && index !== -1) {
			this.filesWithExclusiveTests.splice(index, 1);
		}
	}

	trackFailures(api) {
		api.on('test-run', (runStatus, files) => {
			files.forEach(file => {
				this.pruneFailures(nodePath.relative(process.cwd(), file));
			});

			const currentVector = this.runVector;
			runStatus.on('error', err => {
				this.countFailure(err.file, currentVector);
			});
			runStatus.on('test', result => {
				if (result.error) {
					this.countFailure(result.file, currentVector);
				}
			});
		});
	}

	pruneFailures(file) {
		this.filesWithFailures = this.filesWithFailures.filter(state => state.file !== file);
	}

	countFailure(file, vector) {
		const isUpdate = this.filesWithFailures.some(state => {
			if (state.file !== file) {
				return false;
			}

			state.count++;
			return true;
		});

		if (!isUpdate) {
			this.filesWithFailures.push({
				file,
				vector,
				count: 1
			});
		}
	}

	sumPreviousFailures(beforeVector) {
		let total = 0;

		this.filesWithFailures.forEach(state => {
			if (state.vector < beforeVector) {
				total += state.count;
			}
		});

		return total;
	}

	cleanUnlinkedTests(unlinkedTests) {
		unlinkedTests.forEach(testFile => {
			this.updateTestDependencies(testFile, []);
			this.updateExclusivity(testFile, false);
			this.pruneFailures(testFile);
		});
	}

	observeStdin(stdin) {
		stdin.resume();
		stdin.setEncoding('utf8');

		stdin.on('data', data => {
			data = data.trim().toLowerCase();
			if (data !== 'r' && data !== 'rs' && data !== 'u') {
				return;
			}

			// Cancel the debouncer, it might rerun specific tests whereas *all* tests
			// need to be rerun
			this.debouncer.cancel();
			this.busy.then(() => {
				// Cancel the debouncer again, it might have restarted while waiting for
				// the busy promise to fulfil
				this.debouncer.cancel();
				this.clearLogOnNextRun = false;
				if (data === 'u') {
					this.updatePreviousSnapshots();
				} else {
					this.rerunAll();
				}
			});
		});
	}

	rerunAll() {
		this.dirtyStates = {};
		this.run();
	}

	updatePreviousSnapshots() {
		this.dirtyStates = {};
		this.run(this.previousFiles, true);
	}

	runAfterChanges() {
		const dirtyStates = this.dirtyStates;
		this.dirtyStates = {};

		const dirtyPaths = Object.keys(dirtyStates).filter(path => {
			if (this.touchedFiles.has(path)) {
				debug('Ignoring known touched file %s', path);
				this.touchedFiles.delete(path);
				return false;
			}
			return true;
		});
		const dirtyTests = dirtyPaths.filter(this.avaFiles.isTest);
		const dirtySources = diff(dirtyPaths, dirtyTests);
		const addedOrChangedTests = dirtyTests.filter(path => dirtyStates[path] !== 'unlink');
		const unlinkedTests = diff(dirtyTests, addedOrChangedTests);

		this.cleanUnlinkedTests(unlinkedTests);

		// No need to rerun tests if the only change is that tests were deleted
		if (unlinkedTests.length === dirtyPaths.length) {
			return;
		}

		if (dirtySources.length === 0) {
			// Run any new or changed tests
			this.run(addedOrChangedTests);
			return;
		}

		// Try to find tests that depend on the changed source files
		const testsBySource = dirtySources.map(path => {
			return this.testDependencies.filter(dep => dep.contains(path)).map(dep => {
				debug('%s is a dependency of %s', path, dep.file);
				return dep.file;
			});
		}, this).filter(tests => tests.length > 0);

		// Rerun all tests if source files were changed that could not be traced to
		// specific tests
		if (testsBySource.length !== dirtySources.length) {
			debug('Sources remain that cannot be traced to specific tests: %O', dirtySources);
			debug('Rerunning all tests');
			this.run();
			return;
		}

		// Run all affected tests
		this.run(union(addedOrChangedTests, uniq(flatten(testsBySource))));
	}
}

module.exports = Watcher;
