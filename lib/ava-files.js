var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var slash = require('slash');
var globby = require('globby');
var flatten = require('arr-flatten');

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

function AvaFiles(files) {
	if (!(this instanceof AvaFiles)) {
		throw new TypeError('Class constructor AvaFiles cannot be invoked without \'new\'');
	}

	if (!files || !files.length) {
		files = defaultIncludePatterns();
	}

	this.excludePatterns = defaultExcludePatterns();

	this.files = files;
}

AvaFiles.prototype.findTestFiles = function () {
	return handlePaths(this.files, this.excludePatterns);
};

function handlePaths(files, excludePatterns) {
	// convert pinkie-promise to Bluebird promise
	files = Promise.resolve(globby(files.concat(excludePatterns)));

	return files
		.map(function (file) {
			if (fs.statSync(file).isDirectory()) {
				var pattern = path.join(file, '**', '*.js');

				if (process.platform === 'win32') {
					// Always use / in patterns, harmonizing matching across platforms.
					pattern = slash(pattern);
				}

				return handlePaths([pattern], excludePatterns);
			}

			// globby returns slashes even on Windows. Normalize here so the file
			// paths are consistently platform-accurate as tests are run.
			return path.normalize(file);
		})
		.then(flatten)
		.filter(function (file) {
			return path.extname(file) === '.js' && path.basename(file)[0] !== '_';
		})
		.map(function (file) {
			return path.resolve(file);
		});
}

module.exports = AvaFiles;
module.exports.defaultIncludePatterns = defaultIncludePatterns;
module.exports.defaultExcludePatterns = defaultExcludePatterns;
