'use strict';
const path = require('path');
const globby = require('globby');
const providerManager = require('./provider-manager');

const {
	classify,
	defaultIgnorePatterns,
	hasExtension,
	isHelperish,
	matches,
	normalizeFileForMatching,
	normalizePattern,
	normalizePatterns
} = require('./glob-helpers.cjs');

exports.classify = classify;
exports.hasExtension = hasExtension;
exports.isHelperish = isHelperish;
exports.matches = matches;
exports.normalizeFileForMatching = normalizeFileForMatching;
exports.normalizePattern = normalizePattern;
exports.normalizePatterns = normalizePatterns;

const defaultIgnoredByWatcherPatterns = [
	'**/*.snap.md', // No need to rerun tests when the Markdown files change.
	'ava.config.js', // Config is not reloaded so avoid rerunning tests when it changes.
	'ava.config.cjs' // Config is not reloaded so avoid rerunning tests when it changes.
];

const buildExtensionPattern = extensions => extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

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

function applyTestFileFilter({cwd, filter, testFiles}) {
	return testFiles.filter(file => matches(normalizeFileForMatching(cwd, file), filter));
}

exports.applyTestFileFilter = applyTestFileFilter;
