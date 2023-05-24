'use strict';
const path = require('node:path');
const process = require('node:process');

const ignoreByDefault = require('ignore-by-default');
const picomatch = require('picomatch');

const slash = require('./slash.cjs');

const defaultIgnorePatterns = [...ignoreByDefault.directories(), '**/node_modules'];
exports.defaultIgnorePatterns = defaultIgnorePatterns;

const defaultPicomatchIgnorePatterns = [
	...defaultIgnorePatterns,
	// Unlike globby(), picomatch needs a complete pattern when ignoring directories.
	...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`),
];

const defaultMatchNoIgnore = picomatch(defaultPicomatchIgnorePatterns);

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
			matchNoIgnore: picomatch(patterns),
			individualMatchers: patterns.map(pattern => ({pattern, match: picomatch(pattern, {ignore})})),
		};
		matchingCache.set(input, result);
	}

	return result;
};

exports.processMatchingPatterns = processMatchingPatterns;

const matchesIgnorePatterns = (file, patterns) => {
	const {matchNoIgnore} = processMatchingPatterns(patterns);
	return matchNoIgnore(file) || defaultMatchNoIgnore(file);
};

function classify(file, {cwd, extensions, filePatterns, ignoredByWatcherPatterns}) {
	file = normalizeFileForMatching(cwd, file);
	return {
		isIgnoredByWatcher: matchesIgnorePatterns(file, ignoredByWatcherPatterns),
		isTest: hasExtension(extensions, file) && !isHelperish(file) && filePatterns.length > 0 && matches(file, filePatterns),
	};
}

exports.classify = classify;

const hasExtension = (extensions, file) => extensions.includes(path.extname(file).slice(1));

exports.hasExtension = hasExtension;

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

function matches(file, patterns) {
	const {match} = processMatchingPatterns(patterns);
	return match(file);
}

exports.matches = matches;

function normalizeFileForMatching(cwd, file) {
	if (process.platform === 'win32') {
		cwd = slash(cwd);
		file = slash(file);
	}

	// Note that if `file` is outside `cwd` we can't normalize it. If this turns
	// out to be a real-world scenario we may have to make changes in calling code
	// to make sure the file isn't even selected for matching.
	if (!file.startsWith(cwd)) {
		return file;
	}

	// Assume `cwd` does *not* end in a slash.
	return file.slice(cwd.length + 1);
}

exports.normalizeFileForMatching = normalizeFileForMatching;

function normalizePattern(pattern) {
	// Always use `/` in patterns, harmonizing matching across platforms
	if (process.platform === 'win32') {
		pattern = slash(pattern);
	}

	if (pattern.endsWith('/')) {
		pattern = pattern.slice(0, -1);
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
