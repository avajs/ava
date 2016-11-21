'use strict';
const nodePath = require('path');
const debug = require('debug')('ava:watcher');
const diff = require('lodash.difference');
const chokidar = require('chokidar');
const flatten = require('arr-flatten');
const union = require('array-union');
const uniq = require('array-uniq');
const AvaFiles = require('ava-files');

function rethrowAsync(err) {
	// Don't swallow exceptions. Note that any
	// expected error should already have been logged
	setImmediate(() => {
		throw err;
	});
}

function Watcher(logger, api, files, sources, extensions) {
	this.debouncer = new Debouncer(this);
	this.avaFiles = new AvaFiles({
		files: files,
		extensions: extensions,
		sources: sources
	});

	this.clearLogOnNextRun = true;
	this.runVector = 0;
	this.run = function (specificFiles) {
		if (this.runVector > 0) {
			var cleared = this.clearLogOnNextRun && logger.clear();
			if (!cleared) {
				logger.reset();
				logger.section();
			}
			this.clearLogOnNextRun = true;

			logger.reset();
			logger.start();
		}

		var currentVector = this.runVector += 1;

		var runOnlyExclusive = false;

		if (specificFiles) {
			var exclusiveFiles = specificFiles.filter(function (file) {
				return this.filesWithExclusiveTests.indexOf(file) !== -1;
			}, this);

			runOnlyExclusive = exclusiveFiles.length !== this.filesWithExclusiveTests.length;

			if (runOnlyExclusive) {
				// The test files that previously contained exclusive tests are always
				// run, together with the remaining specific files.
				var remainingFiles = diff(specificFiles, exclusiveFiles);
				specificFiles = this.filesWithExclusiveTests.concat(remainingFiles);
			}
		}

		var self = this;
		var options = {
			runOnlyExclusive: runOnlyExclusive
		};
		if (extensions) {
			options.extensions = extensions;
		}
		this.busy = api.run(specificFiles || files, options).then(function (runStatus) {
			runStatus.previousFailCount = self.sumPreviousFailures(currentVector);
			logger.finish(runStatus);

			var badCounts = runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount;
			self.clearLogOnNextRun = self.clearLogOnNextRun && badCounts === 0;
		}, rethrowAsync);
	};

	this.testDependencies = [];
	this.trackTestDependencies(api, sources);

	this.filesWithExclusiveTests = [];
	this.trackExclusivity(api);

	this.filesWithFailures = [];
	this.trackFailures(api);

	this.dirtyStates = {};
	this.watchFiles();
	this.rerunAll();
}

module.exports = Watcher;

Watcher.prototype.watchFiles = function () {
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
};

Watcher.prototype.trackTestDependencies = function (api) {
	const relative = absPath => nodePath.relative('.', absPath);

	api.on('test-run', runStatus => {
		runStatus.on('dependencies', (file, dependencies) => {
			const sourceDeps = dependencies.map(relative).filter(this.avaFiles.isSource);
			this.updateTestDependencies(file, sourceDeps);
		});
	});
};

Watcher.prototype.updateTestDependencies = function (file, sources) {
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
};

Watcher.prototype.trackExclusivity = function (api) {
	api.on('stats', stats => {
		this.updateExclusivity(stats.file, stats.hasExclusive);
	});
};

Watcher.prototype.updateExclusivity = function (file, hasExclusiveTests) {
	const index = this.filesWithExclusiveTests.indexOf(file);

	if (hasExclusiveTests && index === -1) {
		this.filesWithExclusiveTests.push(file);
	} else if (!hasExclusiveTests && index !== -1) {
		this.filesWithExclusiveTests.splice(index, 1);
	}
};

Watcher.prototype.trackFailures = function (api) {
	api.on('test-run', (runStatus, files) => {
		files.forEach(file => {
			this.pruneFailures(nodePath.relative('.', file));
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
};

Watcher.prototype.pruneFailures = function (file) {
	this.filesWithFailures = this.filesWithFailures.filter(state => state.file !== file);
};

Watcher.prototype.countFailure = function (file, vector) {
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
};

Watcher.prototype.sumPreviousFailures = function (beforeVector) {
	let total = 0;

	this.filesWithFailures.forEach(state => {
		if (state.vector < beforeVector) {
			total += state.count;
		}
	});

	return total;
};

Watcher.prototype.cleanUnlinkedTests = function (unlinkedTests) {
	unlinkedTests.forEach(testFile => {
		this.updateTestDependencies(testFile, []);
		this.updateExclusivity(testFile, false);
		this.pruneFailures(testFile);
	});
};

Watcher.prototype.observeStdin = function (stdin) {
	stdin.resume();
	stdin.setEncoding('utf8');

	stdin.on('data', data => {
		data = data.trim().toLowerCase();
		if (data !== 'r' && data !== 'rs') {
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
			this.rerunAll();
		});
	});
};

Watcher.prototype.rerunAll = function () {
	this.dirtyStates = {};
	this.run();
};

Watcher.prototype.runAfterChanges = function () {
	const dirtyStates = this.dirtyStates;
	this.dirtyStates = {};

	const dirtyPaths = Object.keys(dirtyStates);
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
		debug('Sources remain that cannot be traced to specific tests. Rerunning all tests');
		this.run();
		return;
	}

	// Run all affected tests.
	this.run(union(addedOrChangedTests, uniq(flatten(testsBySource))));
};

function Debouncer(watcher) {
	this.watcher = watcher;
	this.timer = null;
	this.repeat = false;
}

Debouncer.prototype.debounce = function () {
	if (this.timer) {
		this.again = true;
		return;
	}

	const self = this;

	const timer = this.timer = setTimeout(() => {
		self.watcher.busy.then(() => {
			// Do nothing if debouncing was canceled while waiting for the busy
			// promise to fulfil
			if (self.timer !== timer) {
				return;
			}

			if (self.again) {
				self.timer = null;
				self.again = false;
				self.debounce();
			} else {
				self.watcher.runAfterChanges();
				self.timer = null;
				self.again = false;
			}
		});
	}, 10);
};

Debouncer.prototype.cancel = function () {
	if (this.timer) {
		clearTimeout(this.timer);
		this.timer = null;
		this.again = false;
	}
};

function TestDependency(file, sources) {
	this.file = file;
	this.sources = sources;
}

TestDependency.prototype.contains = function (source) {
	return this.sources.indexOf(source) !== -1;
};
