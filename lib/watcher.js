'use strict';

var AvaError = require('./ava-error');
var debug = require('debug')('ava:watcher');
var defaultIgnore = require('ignore-by-default').directories();
var multimatch = require('multimatch');
var nodePath = require('path');
var Promise = require('bluebird');

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

function getChokidarPatterns(sources, initialFiles) {
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
	paths = paths.concat(initialFiles);

	if (ignored.length === 0) {
		ignored = defaultIgnore;
	}

	return {paths: paths, ignored: ignored};
}

exports.start = function (logger, api, files, excludePatterns, sources, stdin) {
	var isTest = makeTestMatcher(files, excludePatterns);
	var patterns = getChokidarPatterns(sources, files);

	var watcher = requireChokidar().watch(patterns.paths, {
		ignored: patterns.ignored,
		ignoreInitial: true
	});

	var busy = api.run().then(function () {
		logger.finish();
	}).catch(rethrowAsync);

	var dirtyStates = {};
	watcher.on('all', function (event, path) {
		if (event === 'add' || event === 'change' || event === 'unlink') {
			debug('Detected %s of %s', event, path);
			dirtyStates[path] = event;
			debounce();
		}
	});

	var debouncing = null;
	var debounceAgain = false;
	function debounce() {
		if (debouncing) {
			debounceAgain = true;
			return;
		}

		var timer = debouncing = setTimeout(function () {
			busy.then(function () {
				// Do nothing if debouncing was canceled while waiting for the busy
				// promise to fulfil.
				if (debouncing !== timer) {
					return;
				}

				if (debounceAgain) {
					debouncing = null;
					debounceAgain = false;
					debounce();
				} else {
					busy = runAfterChanges(logger, api, isTest, dirtyStates);
					dirtyStates = {};
					debouncing = null;
					debounceAgain = false;
				}
			});
		}, 10);
	}

	function cancelDebounce() {
		if (debouncing) {
			clearTimeout(debouncing);
			debouncing = null;
			debounceAgain = false;
		}
	}

	stdin.resume();
	stdin.setEncoding('utf8');
	stdin.on('data', function (data) {
		data = data.trim().toLowerCase();
		if (data !== 'rs') {
			return;
		}

		// Cancel the debouncer, it might rerun specific tests whereas *all* tests
		// need to be rerun.
		cancelDebounce();
		busy.then(function () {
			// Cancel the debouncer again, it might have restarted while waiting for
			// the busy promise to fulfil.
			cancelDebounce();
			busy = runAfterChanges(logger, api, isTest, {});
		});
	});
};

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

function runAfterChanges(logger, api, isTest, dirtyStates) {
	var dirtyPaths = Object.keys(dirtyStates);
	var dirtyTests = dirtyPaths.filter(isTest);
	var addedOrChangedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] !== 'unlink';
	});
	var unlinkedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] === 'unlink';
	});

	// No need to rerun tests if the only change is that tests were deleted.
	if (dirtyPaths.length > 0 && unlinkedTests.length === dirtyPaths.length) {
		return Promise.resolve();
	}

	return new Promise(function (resolve) {
		logger.reset();

		// Run any new or changed tests, unless non-test files were changed too.
		// In that case rerun the entire test suite.
		if (dirtyPaths.length > 0 && dirtyTests.length === dirtyPaths.length) {
			resolve(api.run(addedOrChangedTests));
		} else {
			resolve(api.run());
		}
	}).then(function () {
		logger.finish();
	}).catch(rethrowAsync);
}
