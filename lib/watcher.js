'use strict';

var AvaError = require('./ava-error');
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

exports.start = function (logger, api, logError) {
	var isTest = makeTestMatcher(api.files, api.excludePatterns);

	// TODO(novemberborn) allow these patterns to be specified, or perhaps match
	// anything (not just JS files).
	var watcher = requireChokidar().watch(['package.json', '**/*.js'], {
		// Copied from
		// <https://github.com/remy/nodemon/blob/8e48001dc494702bf519c6fdc2097b686de228af/lib/config/defaults.js#L12>.
		// TODO(novemberborn) extract into a package so a sensible set of patterns
		// can be shared amongst projects.
		// TODO(novemberborn) make configurable, perhaps similarly to how the
		// include patterns are specified.
		ignored: ['.git', 'node_modules', 'bower_components', '.sass-cache'],
		ignoreInitial: true
	});

	var busy = api.run().then(function () {
		logger.finish();
	}).catch(function (err) {
		logError(err);
		// Exit if an error occurs during the initial run.
		logger.exit(1);
		// Return a pending promise to avoid running new tests while exiting.
		return new Promise(function () {});
	});

	var dirtyStates = {};
	watcher.on('all', function (event, path) {
		if (event === 'add' || event === 'change' || event === 'unlink') {
			dirtyStates[path] = event;
			debounce();
		}
	});

	var debouncing = false;
	var debounceAgain = false;
	function debounce() {
		if (debouncing) {
			debounceAgain = true;
			return;
		}

		debouncing = true;
		setTimeout(function () {
			busy.then(function () {
				if (debounceAgain) {
					debouncing = debounceAgain = false;
					debounce();
				} else {
					busy = runAfterChanges(logger, api, logError, isTest, dirtyStates);
					dirtyStates = {};
					debouncing = debounceAgain = false;
				}
			});
		}, 10);
	}
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

		// Check if the first directory component in the path matches a pattern. If
		// so, generate a new pattern with **/*.js and see if the full path matches
		// that. This mimicks the behavior in api.js
		var firstDir = path.split(nodePath.sep)[0];
		if (!firstDir || multimatch(firstDir, initialPatterns).length === 0) {
			return false;
		}
		var recursivePatterns = [].concat(nodePath.join(firstDir, '**', '*.js'), excludePatterns);
		return multimatch(path, recursivePatterns).length === 1;
	};
}

function runAfterChanges(logger, api, logError, isTest, dirtyStates) {
	var dirtyPaths = Object.keys(dirtyStates);
	var dirtyTests = dirtyPaths.filter(isTest);
	var addedOrChangedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] !== 'unlink';
	});
	var unlinkedTests = dirtyTests.filter(function (path) {
		return dirtyStates[path] === 'unlink';
	});

	// No need to rerun tests if the only change is that tests were deleted.
	if (unlinkedTests.length === dirtyPaths.length) {
		return Promise.resolve();
	}

	return new Promise(function (resolve) {
		logger.reset();

		// Run any new or changed tests, unless non-test files were changed too.
		// In that case rerun the entire test suite.
		if (dirtyTests.length === dirtyPaths.length) {
			resolve(api.run(addedOrChangedTests));
		} else {
			resolve(api.run());
		}
	}).catch(function (err) {
		logError(err);
	}).then(function () {
		logger.finish();
	});
}
