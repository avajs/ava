'use strict';

var AvaError = require('./ava-error');
var debug = require('debug')('ava:watcher');
var defaultIgnore = require('ignore-by-default').directories();
var multimatch = require('multimatch');
var nodePath = require('path');

function requireChokidar() {
	try {
		return require('chokidar');
	} catch (err) {
		throw new AvaError('The optional dependency chokidar failed to install and is required for --watch. Chokidar is likely not supported on your platform.');
	}
}

function rethrowAsync(err) {
	// Don't swallow exceptions. Note that any expected error should already have
	// been logged.
	setImmediate(function () {
		throw err;
	});
}

function Watcher(logger, api, files, sources) {
	this.debouncer = new Debouncer(this);

	this.isTest = makeTestMatcher(files, api.excludePatterns);
	this.run = function (specificFiles) {
		logger.reset();
		this.busy = api.run(specificFiles || files).then(function () {
			logger.finish();
		}, rethrowAsync);
	};

	this.dirtyStates = {};
	this.watchFiles(files, sources);
	this.rerunAll();
}

module.exports = Watcher;

Watcher.prototype.watchFiles = function (files, sources) {
	var patterns = getChokidarPatterns(files, sources);

	var self = this;
	requireChokidar().watch(patterns.paths, {
		ignored: patterns.ignored,
		ignoreInitial: true
	}).on('all', function (event, path) {
		if (event === 'add' || event === 'change' || event === 'unlink') {
			debug('Detected %s of %s', event, path);
			self.dirtyStates[path] = event;
			self.debouncer.debounce();
		}
	});
};

Watcher.prototype.observeStdin = function (stdin) {
	var self = this;

	stdin.resume();
	stdin.setEncoding('utf8');
	stdin.on('data', function (data) {
		data = data.trim().toLowerCase();
		if (data !== 'rs') {
			return;
		}

		// Cancel the debouncer, it might rerun specific tests whereas *all* tests
		// need to be rerun.
		self.debouncer.cancel();
		self.busy.then(function () {
			// Cancel the debouncer again, it might have restarted while waiting for
			// the busy promise to fulfil.
			self.debouncer.cancel();
			self.rerunAll();
		});
	});
};

Watcher.prototype.rerunAll = function () {
	this.dirtyStates = {};
	this.run();
};

Watcher.prototype.runAfterChanges = function () {
	var dirtyStates = this.dirtyStates;
	this.dirtyStates = {};

	var dirtyPaths = Object.keys(dirtyStates);
	var dirtyTests = dirtyPaths.filter(this.isTest);
	var addedOrChangedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] !== 'unlink';
	});
	var unlinkedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] === 'unlink';
	});

	// Rerun all tests if non-test files were changed.
	if (dirtyTests.length !== dirtyPaths.length) {
		this.rerunAll();
		return;
	}

	// No need to rerun tests if the only change is that tests were deleted.
	if (unlinkedTests.length === dirtyPaths.length) {
		this.dirtyStates = {};
		return;
	}

	// Run any new or changed tests.
	this.run(addedOrChangedTests);
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

	var self = this;
	var timer = this.timer = setTimeout(function () {
		self.watcher.busy.then(function () {
			// Do nothing if debouncing was canceled while waiting for the busy
			// promise to fulfil.
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

function getChokidarPatterns(files, sources) {
	var paths = [];
	var ignored = [];

	sources.forEach(function (pattern) {
		if (pattern[0] === '!') {
			ignored.push(pattern.slice(1));
		} else {
			paths.push(pattern);
		}
	});

	if (paths.length === 0) {
		paths = ['package.json', '**/*.js'];
	}
	paths = paths.concat(files);

	if (ignored.length === 0) {
		ignored = defaultIgnore;
	}

	return {paths: paths, ignored: ignored};
}

function makeTestMatcher(files, excludePatterns) {
	var initialPatterns = files.concat(excludePatterns);
	return function (path) {
		// Like in api.js, tests must be .js files and not start with _
		if (nodePath.extname(path) !== '.js' || nodePath.basename(path)[0] === '_') {
			return false;
		}

		// Check if the entire path matches a pattern.
		if (multimatch(path, initialPatterns).length === 1) {
			return true;
		}

		// Check if the path contains any directory components.
		var dirname = nodePath.dirname(path);
		if (dirname === '.') {
			return false;
		}

		// Compute all possible subpaths. Note that the dirname is assumed to be
		// relative to the working directory, without a leading `./`.
		var subpaths = dirname.split(nodePath.sep).reduce(function (subpaths, component) {
			var parent = subpaths[subpaths.length - 1];
			if (parent) {
				subpaths.push(nodePath.join(parent, component));
			} else {
				subpaths.push(component);
			}
			return subpaths;
		}, []);

		// Check if any of the possible subpaths match a pattern. If so, generate a
		// new pattern with **/*.js.
		var recursivePatterns = subpaths.filter(function (subpath) {
			return multimatch(subpath, initialPatterns).length === 1;
		}).map(function (subpath) {
			return nodePath.join(subpath, '**', '*.js');
		});

		// See if the entire path matches any of the subpaths patterns, taking the
		// excludePatterns into account. This mimicks the behavior in api.js
		return multimatch(path, recursivePatterns.concat(excludePatterns)).length === 1;
	};
}
