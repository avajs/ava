'use strict';
const path = require('path');
const globby = require('globby');
const ignoreByDefault = require('ignore-by-default');
const micromatch = require('micromatch');
const slash = require('slash');

const defaultIgnorePatterns = [...ignoreByDefault.directories(), '**/node_modules'];

const buildExtensionPattern = extensions => extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

const normalizePatterns = patterns => {
	// Always use `/` in patterns, harmonizing matching across platforms
	if (process.platform === 'win32') {
		patterns = patterns.map(pattern => slash(pattern));
	}

	return patterns.map(pattern => {
		if (pattern.startsWith('./')) {
			return pattern.slice(2);
		}

		if (pattern.startsWith('!./')) {
			return `!${pattern.slice(3)}`;
		}

		return pattern;
	});
};

function normalizeGlobs(testPatterns, helperPatterns, sourcePatterns, extensions) {
	if (typeof testPatterns !== 'undefined' && (!Array.isArray(testPatterns) || testPatterns.length === 0)) {
		throw new Error('The \'files\' configuration must be an array containing glob patterns.');
	}

	if (typeof helperPatterns !== 'undefined' && (!Array.isArray(helperPatterns) || helperPatterns.length === 0)) {
		throw new Error('The \'helpers\' configuration must be an array containing glob patterns.');
	}

	if (sourcePatterns && (!Array.isArray(sourcePatterns) || sourcePatterns.length === 0)) {
		throw new Error('The \'sources\' configuration must be an array containing glob patterns.');
	}

	const extensionPattern = buildExtensionPattern(extensions);
	const defaultTestPatterns = [
		`**/__tests__/**/*.${extensionPattern}`,
		`**/*.spec.${extensionPattern}`,
		`**/*.test.${extensionPattern}`,
		`**/test-*.${extensionPattern}`,
		`**/test.${extensionPattern}`,
		`**/test/**/*.${extensionPattern}`,
		`**/tests/**/*.${extensionPattern}`
	];

	if (testPatterns) {
		testPatterns = normalizePatterns(testPatterns);

		if (testPatterns.every(pattern => pattern.startsWith('!'))) {
			// Use defaults if patterns only contains exclusions.
			testPatterns = [...defaultTestPatterns, ...testPatterns];
		}
	} else {
		testPatterns = defaultTestPatterns;
	}

	if (helperPatterns) {
		helperPatterns = normalizePatterns(helperPatterns);
	} else {
		helperPatterns = [];
	}

	const defaultSourcePatterns = [
		'**/*.snap',
		'ava.config.js',
		'package.json',
		`**/*.${extensionPattern}`
	];
	if (sourcePatterns) {
		sourcePatterns = normalizePatterns(sourcePatterns);

		if (sourcePatterns.every(pattern => pattern.startsWith('!'))) {
			// Use defaults if patterns only contains exclusions.
			sourcePatterns = [...defaultSourcePatterns, ...sourcePatterns];
		}
	} else {
		sourcePatterns = defaultSourcePatterns;
	}

	return {extensions, testPatterns, helperPatterns, sourcePatterns};
}

exports.normalizeGlobs = normalizeGlobs;

const hasExtension = (extensions, file) => extensions.includes(path.extname(file).slice(1));

exports.hasExtension = hasExtension;

const findFiles = async (cwd, patterns) => {
	const files = await globby(patterns, {
		absolute: true,
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

	// `globby` returns slashes even on Windows. Normalize here so the file
	// paths are consistently platform-accurate as tests are run.
	if (process.platform === 'win32') {
		return files.map(file => path.normalize(file));
	}

	return files;
};

async function findHelpersAndTests({cwd, extensions, testPatterns, helperPatterns}) {
	// Search for tests concurrently with finding helpers.
	const findingTests = findFiles(cwd, testPatterns);

	const uniqueHelpers = new Set();
	if (helperPatterns.length > 0) {
		for (const file of await findFiles(cwd, helperPatterns)) {
			if (!hasExtension(extensions, file)) {
				continue;
			}

			uniqueHelpers.add(file);
		}
	}

	const tests = [];
	for (const file of await findingTests) {
		if (!hasExtension(extensions, file)) {
			continue;
		}

		if (path.basename(file).startsWith('_')) {
			uniqueHelpers.add(file);
		} else if (!uniqueHelpers.has(file)) { // Helpers cannot be tests.
			tests.push(file);
		}
	}

	return {helpers: [...uniqueHelpers], tests};
}

exports.findHelpersAndTests = findHelpersAndTests;

async function findTests({cwd, extensions, testPatterns, helperPatterns}) {
	const rejectHelpers = helperPatterns.length > 0;

	const tests = [];
	for (const file of await findFiles(cwd, testPatterns)) {
		if (!hasExtension(extensions, file) || path.basename(file).startsWith('_')) {
			continue;
		}

		if (rejectHelpers && matches(normalizeFileForMatching(cwd, file), helperPatterns)) {
			continue;
		}

		tests.push(file);
	}

	return {tests};
}

exports.findTests = findTests;

function getChokidarPatterns({sourcePatterns, testPatterns}) {
	const paths = [];
	const ignored = defaultIgnorePatterns.map(pattern => `${pattern}/**/*`);

	for (const pattern of [...sourcePatterns, ...testPatterns]) {
		if (!pattern.startsWith('!')) {
			paths.push(pattern);
		}
	}

	return {paths, ignored};
}

exports.getChokidarPatterns = getChokidarPatterns;

const matchingCache = new WeakMap();
const processMatchingPatterns = input => {
	let result = matchingCache.get(input);
	if (!result) {
		const ignore = [
			...defaultIgnorePatterns,
			// Unlike globby(), micromatch needs a complete pattern when ignoring directories.
			...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`)
		];
		const patterns = input.filter(pattern => {
			if (pattern.startsWith('!')) {
				// Unlike globby(), micromatch needs a complete pattern when ignoring directories.
				ignore.push(pattern.slice(1), `${pattern.slice(1)}/**/*`);
				return false;
			}

			return true;
		});

		result = {patterns, ignore};
		matchingCache.set(input, result);
	}

	return result;
};

const matches = (file, patterns) => {
	let ignore;
	({patterns, ignore} = processMatchingPatterns(patterns));
	return micromatch.some(file, patterns, {ignore});
};

const NOT_IGNORED = ['**/*'];

const normalizeFileForMatching = (cwd, file) => {
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
};

function classify(file, {cwd, extensions, helperPatterns, testPatterns, sourcePatterns}) {
	let isHelper = false;
	let isTest = false;
	let isSource = false;

	file = normalizeFileForMatching(cwd, file);

	if (hasExtension(extensions, file)) {
		if (path.basename(file).startsWith('_')) {
			isHelper = matches(file, NOT_IGNORED);
		} else {
			isHelper = helperPatterns.length > 0 && matches(file, helperPatterns);

			if (!isHelper) {
				isTest = testPatterns.length > 0 && matches(file, testPatterns);

				if (!isTest) {
					// Note: Don't check sourcePatterns.length since we still need to
					// check the file against the default ignore patterns.
					isSource = matches(file, sourcePatterns);
				}
			}
		}
	} else {
		isSource = matches(file, sourcePatterns);
	}

	return {isHelper, isTest, isSource};
}

exports.classify = classify;
