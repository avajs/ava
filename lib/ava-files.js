var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var slash = require('slash');
var globby = require('globby');
var flatten = require('arr-flatten');
var defaultIgnore = require('ignore-by-default').directories();
var multimatch = require('multimatch');

function defaultExcludePatterns() {
	return [
		'!**/node_modules/**',
		'!**/fixtures/**',
		'!**/helpers/**'
	];
}

function defaultIncludePatterns() {
	return [
		'test.js',
		'test-*.js',
		'test',
		'**/__tests__',
		'**/*.test.js'
	];
}

function AvaFiles(files, sources) {
	if (!(this instanceof AvaFiles)) {
		throw new TypeError('Class constructor AvaFiles cannot be invoked without \'new\'');
	}

	if (!files || !files.length) {
		files = defaultIncludePatterns();
	}

	this.excludePatterns = defaultExcludePatterns();

	this.files = files;
	this.sources = sources || [];
}

AvaFiles.prototype.findTestFiles = function () {
	return handlePaths(this.files, this.excludePatterns, {
		cache: Object.create(null),
		statCache: Object.create(null),
		realpathCache: Object.create(null),
		symlinks: Object.create(null)
	});
};

function getDefaultIgnorePatterns() {
	return defaultIgnore.map(function (dir) {
		return dir + '/**/*';
	});
}

// Used on paths before they're passed to multimatch to harmonize matching
// across platforms.
var matchable = process.platform === 'win32' ? slash : function (path) {
	return path;
};

AvaFiles.prototype.makeSourceMatcher = function () {
	var mixedPatterns = [];
	var defaultIgnorePatterns = getDefaultIgnorePatterns();
	var overrideDefaultIgnorePatterns = [];

	var hasPositivePattern = false;
	this.sources.forEach(function (pattern) {
		mixedPatterns.push(pattern);
		// TODO: why not just pattern[0] !== '!'
		if (!hasPositivePattern && pattern[0] !== '!') {
			hasPositivePattern = true;
		}

		// Extract patterns that start with an ignored directory. These need to be
		// rematched separately.
		if (defaultIgnore.indexOf(pattern.split('/')[0]) >= 0) {
			overrideDefaultIgnorePatterns.push(pattern);
		}
	});

	// Same defaults as used for Chokidar.
	if (!hasPositivePattern) {
		mixedPatterns = ['package.json', '**/*.js'].concat(mixedPatterns);
	}

	return function (path) {
		path = matchable(path);

		// Ignore paths outside the current working directory. They can't be matched
		// to a pattern.
		if (/^\.\.\//.test(path)) {
			return false;
		}

		var isSource = multimatch(path, mixedPatterns).length === 1;
		if (!isSource) {
			return false;
		}

		var isIgnored = multimatch(path, defaultIgnorePatterns).length === 1;
		if (!isIgnored) {
			return true;
		}

		var isErroneouslyIgnored = multimatch(path, overrideDefaultIgnorePatterns).length === 1;
		if (isErroneouslyIgnored) {
			return true;
		}

		return false;
	};
};

AvaFiles.prototype.makeTestMatcher = function () {
	var excludePatterns = this.excludePatterns;
	var initialPatterns = this.files.concat(excludePatterns);

	return function (filepath) {
		// Like in api.js, tests must be .js files and not start with _
		if (path.extname(filepath) !== '.js' || path.basename(filepath)[0] === '_') {
			return false;
		}

		// Check if the entire path matches a pattern.
		if (multimatch(matchable(filepath), initialPatterns).length === 1) {
			return true;
		}

		// Check if the path contains any directory components.
		var dirname = path.dirname(filepath);
		if (dirname === '.') {
			return false;
		}

		// Compute all possible subpaths. Note that the dirname is assumed to be
		// relative to the working directory, without a leading `./`.
		var subpaths = dirname.split(/[\\\/]/).reduce(function (subpaths, component) {
			var parent = subpaths[subpaths.length - 1];
			if (parent) {
				// Always use / to makes multimatch consistent across platforms.
				subpaths.push(parent + '/' + component);
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
			// Always use / to makes multimatch consistent across platforms.
			return subpath + '/**/*.js';
		});

		// See if the entire path matches any of the subpaths patterns, taking the
		// excludePatterns into account. This mimicks the behavior in api.js
		return multimatch(matchable(filepath), recursivePatterns.concat(excludePatterns)).length === 1;
	};
};

AvaFiles.prototype.getChokidarPatterns = function () {
	var paths = [];
	var ignored = [];

	this.sources.forEach(function (pattern) {
		if (pattern[0] === '!') {
			ignored.push(pattern.slice(1));
		} else {
			paths.push(pattern);
		}
	});

	// Allow source patterns to override the default ignore patterns. Chokidar
	// ignores paths that match the list of ignored patterns. It uses anymatch
	// under the hood, which supports negation patterns. For any source pattern
	// that starts with an ignored directory, ensure the corresponding negation
	// pattern is added to the ignored paths.
	var overrideDefaultIgnorePatterns = paths.filter(function (pattern) {
		return defaultIgnore.indexOf(pattern.split('/')[0]) >= 0;
	}).map(function (pattern) {
		return '!' + pattern;
	});
	ignored = getDefaultIgnorePatterns().concat(ignored, overrideDefaultIgnorePatterns);

	if (paths.length === 0) {
		paths = ['package.json', '**/*.js'];
	}
	paths = paths.concat(this.files);

	return {
		paths: paths,
		ignored: ignored
	};
};

function handlePaths(files, excludePatterns, globOptions) {
	// convert pinkie-promise to Bluebird promise
	files = Promise.resolve(globby(files.concat(excludePatterns), globOptions));

	var searchedParents = Object.create(null);
	var foundFiles = Object.create(null);

	function alreadySearchingParent(dir) {
		if (searchedParents[dir]) {
			return true;
		}

		var parentDir = path.dirname(dir);

		if (parentDir === dir) {
			// We have reached the root path.
			return false;
		}

		return alreadySearchingParent(parentDir);
	}

	return files
		.map(function (file) {
			if (fs.statSync(file).isDirectory()) {
				if (alreadySearchingParent(file)) {
					return null;
				}

				searchedParents[file] = true;

				var pattern = path.join(file, '**', '*.js');

				if (process.platform === 'win32') {
					// Always use / in patterns, harmonizing matching across platforms.
					pattern = slash(pattern);
				}

				return handlePaths([pattern], excludePatterns, globOptions);
			}

			// globby returns slashes even on Windows. Normalize here so the file
			// paths are consistently platform-accurate as tests are run.
			return path.normalize(file);
		})
		.then(flatten)
		.filter(function (file) {
			return file && path.extname(file) === '.js' && path.basename(file)[0] !== '_';
		})
		.map(function (file) {
			return path.resolve(file);
		})
		.filter(function (file) {
			var alreadyFound = foundFiles[file];
			foundFiles[file] = true;
			return !alreadyFound;
		});
}

module.exports = AvaFiles;
module.exports.defaultIncludePatterns = defaultIncludePatterns;
module.exports.defaultExcludePatterns = defaultExcludePatterns;
