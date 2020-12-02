'use strict';
const path = require('path');
const globby = require('globby');
const ignoreByDefault = require('ignore-by-default');
const picomatch = require('picomatch');
const slash = require('slash');
const providerManager = require('./provider-manager');

const defaultIgnorePatterns = [...ignoreByDefault.directories(), '**/node_modules'];
const defaultPicomatchIgnorePatterns = [
	...defaultIgnorePatterns,
	// Unlike globby(), picomatch needs a complete pattern when ignoring directories.
	...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`)
];

const defaultMatchNoIgnore = picomatch(defaultPicomatchIgnorePatterns);

const defaultIgnoredByWatcherPatterns = [
	'**/*.snap.md', // No need to rerun tests when the Markdown files change.
	'ava.config.js', // Config is not reloaded so avoid rerunning tests when it changes.
	'ava.config.cjs' // Config is not reloaded so avoid rerunning tests when it changes.
];

const buildExtensionPattern = extensions => extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

function normalizePattern(pattern) {
	// Always use `/` in patterns, harmonizing matching across platforms
	if (process.platform === 'win32') {
		pattern = slash(pattern);
	}

	if (pattern.startsWith('./')) {
		return pattern.slice(2);
	}

	if (pattern.startsWith('!./')) {
		return `!${pattern.slice(3)}`;
	}

	return pattern;
}

exports.normalizePattern = normalizePattern;

function normalizePatterns(patterns) {
	return patterns.map(pattern => normalizePattern(pattern));
}

exports.normalizePatterns = normalizePatterns;

function normalizeGlobs({extensions, files: filePatterns, ignoredByWatcher: ignoredByWatcherPatterns, providers}) {
	if (filePatterns !== undefined && (!Array.isArray(filePatterns) || filePatterns.length === 0)) {
		throw new Error('The ’files’ configuration must be an array containing glob patterns.');
	}

	if (ignoredByWatcherPatterns !== undefined && (!Array.isArray(ignoredByWatcherPatterns) || ignoredByWatcherPatterns.length === 0)) {
		throw new Error('The ’ignoredByWatcher’ configuration must be an array containing glob patterns.');
	}

	const extensionPattern = buildExtensionPattern(extensions);
	const defaultTestPatterns = [
		`test.${extensionPattern}`,
		`{src,source}/test.${extensionPattern}`,
		`**/__tests__/**/*.${extensionPattern}`,
		`**/*.spec.${extensionPattern}`,
		`**/*.test.${extensionPattern}`,
		`**/test-*.${extensionPattern}`,
		`**/test/**/*.${extensionPattern}`,
		`**/tests/**/*.${extensionPattern}`,
		'!**/__tests__/**/__{helper,fixture}?(s)__/**/*',
		'!**/test?(s)/**/{helper,fixture}?(s)/**/*'
	];

	if (filePatterns) {
		filePatterns = normalizePatterns(filePatterns);

		if (filePatterns.every(pattern => pattern.startsWith('!'))) {
			// Use defaults if patterns only contains exclusions.
			filePatterns = [...defaultTestPatterns, ...filePatterns];
		}
	} else {
		filePatterns = defaultTestPatterns;
	}

	ignoredByWatcherPatterns = ignoredByWatcherPatterns ? [...defaultIgnoredByWatcherPatterns, ...normalizePatterns(ignoredByWatcherPatterns)] : [...defaultIgnoredByWatcherPatterns];

	for (const {level, main} of providers) {
		if (level >= providerManager.levels.pathRewrites) {
			({filePatterns, ignoredByWatcherPatterns} = main.updateGlobs({filePatterns, ignoredByWatcherPatterns}));
		}
	}

	return {extensions, filePatterns, ignoredByWatcherPatterns};
}

exports.normalizeGlobs = normalizeGlobs;

const hasExtension = (extensions, file) => extensions.includes(path.extname(file).slice(1));

exports.hasExtension = hasExtension;

const globFiles = async (cwd, patterns) => {
	const files = await globby(patterns, {
		// Globs should work relative to the cwd value only (this should be the
		// project directory that AVA is run in).
		absolute: false,
		braceExpansion: true,
		caseSensitiveMatch: false,
		cwd,
		dot: false,
		expandDirectories: false,
		extglob: true,
		followSymbolicLinks: true,
		gitignore: false,
		globstar: true,
		ignore: defaultIgnorePatterns,
		baseNameMatch: false,
		onlyFiles: true,
		stats: false,
		unique: true
	});

	// Return absolute file paths. This has the side-effect of normalizing paths
	// on Windows.
	return files.map(file => path.join(cwd, file));
};

async function findFiles({cwd, extensions, filePatterns}) {
	return (await globFiles(cwd, filePatterns)).filter(file => hasExtension(extensions, file));
}

exports.findFiles = findFiles;

async function findTests({cwd, extensions, filePatterns}) {
	return (await findFiles({cwd, extensions, filePatterns})).filter(file => !path.basename(file).startsWith('_'));
}

exports.findTests = findTests;

function getChokidarIgnorePatterns({ignoredByWatcherPatterns}) {
	return [
		...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`),
		...ignoredByWatcherPatterns.filter(pattern => !pattern.startsWith('!'))
	];
}

exports.getChokidarIgnorePatterns = getChokidarIgnorePatterns;

const matchingCache = new WeakMap();
const processMatchingPatterns = input => {
	let result = matchingCache.get(input);
	if (!result) {
		const ignore = [...defaultPicomatchIgnorePatterns];
		const patterns = input.filter(pattern => {
			if (pattern.startsWith('!')) {
				// Unlike globby(), picomatch needs a complete pattern when ignoring directories.
				ignore.push(pattern.slice(1), `${pattern.slice(1)}/**/*`);
				return false;
			}

			return true;
		});

		result = {
			match: picomatch(patterns, {ignore}),
			matchNoIgnore: picomatch(patterns)
		};
		matchingCache.set(input, result);
	}

	return result;
};

function matches(file, patterns) {
	const {match} = processMatchingPatterns(patterns);
	return match(file);
}

exports.matches = matches;

const matchesIgnorePatterns = (file, patterns) => {
	const {matchNoIgnore} = processMatchingPatterns(patterns);
	return matchNoIgnore(file) || defaultMatchNoIgnore(file);
};

function normalizeFileForMatching(cwd, file) {
	if (process.platform === 'win32') {
		cwd = slash(cwd);
		file = slash(file);
	}

	if (!cwd) { // TODO: Ensure tests provide an actual value.
		return file;
	}

	// TODO: If `file` is outside `cwd` we can't normalize it. Need to figure
	// out if that's a real-world scenario, but we may have to ensure the file
	// isn't even selected.
	if (!file.startsWith(cwd)) {
		return file;
	}

	// Assume `cwd` does *not* end in a slash.
	return file.slice(cwd.length + 1);
}

exports.normalizeFileForMatching = normalizeFileForMatching;

function isHelperish(file) { // Assume file has been normalized already.
	// File names starting with an underscore are deemed "helpers".
	if (path.basename(file).startsWith('_')) {
		return true;
	}

	// This function assumes the file has been normalized. If it couldn't be,
	// don't check if it's got a parent directory that starts with an underscore.
	// Deem it not a "helper".
	if (path.isAbsolute(file)) {
		return false;
	}

	// If the file has a parent directory that starts with only a single
	// underscore, it's deemed a "helper".
	return path.dirname(file).split('/').some(dir => /^_(?:$|[^_])/.test(dir));
}

exports.isHelperish = isHelperish;

function classify(file, {cwd, extensions, filePatterns, ignoredByWatcherPatterns}) {
	file = normalizeFileForMatching(cwd, file);
	return {
		isIgnoredByWatcher: matchesIgnorePatterns(file, ignoredByWatcherPatterns),
		isTest: hasExtension(extensions, file) && !isHelperish(file) && filePatterns.length > 0 && matches(file, filePatterns)
	};
}

exports.classify = classify;

function applyTestFileFilter({cwd, filter, testFiles}) {
	return testFiles.filter(file => matches(normalizeFileForMatching(cwd, file), filter));
}

exports.applyTestFileFilter = applyTestFileFilter;
