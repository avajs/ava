'use strict';
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const slash = require('slash');
const globby = require('globby');
const flatten = require('lodash.flatten');
const autoBind = require('auto-bind');
const defaultIgnore = require('ignore-by-default').directories();
const multimatch = require('multimatch');

function handlePaths(files, excludePatterns, globOptions) {
	// Convert Promise to Bluebird
	files = Promise.resolve(globby(files.concat(excludePatterns), globOptions));

	const searchedParents = new Set();
	const foundFiles = new Set();

	function alreadySearchingParent(dir) {
		if (searchedParents.has(dir)) {
			return true;
		}

		const parentDir = path.dirname(dir);

		if (parentDir === dir) {
			// We have reached the root path
			return false;
		}

		return alreadySearchingParent(parentDir);
	}

	return files
		.map(file => {
			file = path.resolve(globOptions.cwd, file);

			if (fs.statSync(file).isDirectory()) {
				if (alreadySearchingParent(file)) {
					return null;
				}

				searchedParents.add(file);

				let pattern = path.join(file, '**', '*.js');

				if (process.platform === 'win32') {
					// Always use `/` in patterns, harmonizing matching across platforms
					pattern = slash(pattern);
				}

				return handlePaths([pattern], excludePatterns, globOptions);
			}

			// `globby` returns slashes even on Windows. Normalize here so the file
			// paths are consistently platform-accurate as tests are run.
			return path.normalize(file);
		})
		.then(flatten)
		.filter(file => file && path.extname(file) === '.js')
		.filter(file => {
			if (path.basename(file)[0] === '_' && globOptions.includeUnderscoredFiles !== true) {
				return false;
			}

			return true;
		})
		.map(file => path.resolve(file))
		.filter(file => {
			const alreadyFound = foundFiles.has(file);
			foundFiles.add(file);
			return !alreadyFound;
		});
}

const defaultExcludePatterns = () => [
	'!**/node_modules/**',
	'!**/fixtures/**',
	'!**/helpers/**'
];

const defaultIncludePatterns = () => [
	'test.js',
	'test-*.js',
	'test',
	'**/__tests__',
	'**/*.test.js'
];

const defaultHelperPatterns = () => [
	'**/__tests__/helpers/**/*.js',
	'**/__tests__/**/_*.js',
	'**/test/helpers/**/*.js',
	'**/test/**/_*.js'
];

const getDefaultIgnorePatterns = () => defaultIgnore.map(dir => `${dir}/**/*`);

// Used on paths before they're passed to multimatch to harmonize matching
// across platforms
const matchable = process.platform === 'win32' ? slash : (path => path);

class AvaFiles {
	constructor(options) {
		options = options || {};

		let files = (options.files || []).map(file => {
			// `./` should be removed from the beginning of patterns because
			// otherwise they won't match change events from Chokidar
			if (file.slice(0, 2) === './') {
				return file.slice(2);
			}

			return file;
		});

		if (files.length === 0) {
			files = defaultIncludePatterns();
		}

		this.excludePatterns = defaultExcludePatterns();
		this.files = files;
		this.sources = options.sources || [];
		this.cwd = options.cwd || process.cwd();

		autoBind(this);
	}
	findTestFiles() {
		return handlePaths(this.files, this.excludePatterns, {
			cwd: this.cwd,
			cache: Object.create(null),
			statCache: Object.create(null),
			realpathCache: Object.create(null),
			symlinks: Object.create(null)
		});
	}
	findTestHelpers() {
		return handlePaths(defaultHelperPatterns(), ['!**/node_modules/**'], {
			cwd: this.cwd,
			includeUnderscoredFiles: true,
			cache: Object.create(null),
			statCache: Object.create(null),
			realpathCache: Object.create(null),
			symlinks: Object.create(null)
		});
	}
	isSource(filePath) {
		let mixedPatterns = [];
		const defaultIgnorePatterns = getDefaultIgnorePatterns();
		const overrideDefaultIgnorePatterns = [];

		let hasPositivePattern = false;
		this.sources.forEach(pattern => {
			mixedPatterns.push(pattern);

			// TODO: Why not just `pattern[0] !== '!'`?
			if (!hasPositivePattern && pattern[0] !== '!') {
				hasPositivePattern = true;
			}

			// Extract patterns that start with an ignored directory. These need to be
			// rematched separately.
			if (defaultIgnore.indexOf(pattern.split('/')[0]) >= 0) {
				overrideDefaultIgnorePatterns.push(pattern);
			}
		});

		// Same defaults as used for Chokidar
		if (!hasPositivePattern) {
			mixedPatterns = ['package.json', '**/*.js'].concat(mixedPatterns);
		}

		filePath = matchable(filePath);

		// Ignore paths outside the current working directory.
		// They can't be matched to a pattern.
		if (/^\.\.\//.test(filePath)) {
			return false;
		}

		const isSource = multimatch(filePath, mixedPatterns).length === 1;
		if (!isSource) {
			return false;
		}

		const isIgnored = multimatch(filePath, defaultIgnorePatterns).length === 1;
		if (!isIgnored) {
			return true;
		}

		const isErroneouslyIgnored = multimatch(filePath, overrideDefaultIgnorePatterns).length === 1;
		if (isErroneouslyIgnored) {
			return true;
		}

		return false;
	}
	isTest(filePath) {
		const excludePatterns = this.excludePatterns;
		const initialPatterns = this.files.concat(excludePatterns);

		// Like in `api.js`, tests must be `.js` files and not start with `_`
		if (path.extname(filePath) !== '.js' || path.basename(filePath)[0] === '_') {
			return false;
		}

		// Check if the entire path matches a pattern
		if (multimatch(matchable(filePath), initialPatterns).length === 1) {
			return true;
		}

		// Check if the path contains any directory components
		const dirname = path.dirname(filePath);
		if (dirname === '.') {
			return false;
		}

		// Compute all possible subpaths. Note that the dirname is assumed to be
		// relative to the working directory, without a leading `./`.
		const subpaths = dirname.split(/[\\/]/).reduce((subpaths, component) => {
			const parent = subpaths[subpaths.length - 1];

			if (parent) {
				// Always use `/`` to makes multimatch consistent across platforms
				subpaths.push(`${parent}/${component}`);
			} else {
				subpaths.push(component);
			}

			return subpaths;
		}, []);

		// Check if any of the possible subpaths match a pattern. If so, generate a
		// new pattern with **/*.js.
		const recursivePatterns = subpaths
			.filter(subpath => multimatch(subpath, initialPatterns).length === 1)
			// Always use `/` to makes multimatch consistent across platforms
			.map(subpath => `${subpath}/**/*.js`);

		// See if the entire path matches any of the subpaths patterns, taking the
		// excludePatterns into account. This mimicks the behavior in api.js
		return multimatch(matchable(filePath), recursivePatterns.concat(excludePatterns)).length === 1;
	}
	getChokidarPatterns() {
		let paths = [];
		let ignored = [];

		this.sources.forEach(pattern => {
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
		const overrideDefaultIgnorePatterns = paths
			.filter(pattern => defaultIgnore.indexOf(pattern.split('/')[0]) >= 0)
			.map(pattern => `!${pattern}`);

		ignored = getDefaultIgnorePatterns().concat(ignored, overrideDefaultIgnorePatterns);

		if (paths.length === 0) {
			paths = ['package.json', '**/*.js', '**/*.snap'];
		}

		paths = paths.concat(this.files);

		return {
			paths,
			ignored
		};
	}
}

module.exports = AvaFiles;
module.exports.defaultIncludePatterns = defaultIncludePatterns;
module.exports.defaultExcludePatterns = defaultExcludePatterns;
