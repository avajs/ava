import path from 'node:path';
import process from 'node:process';

import ignoreByDefault from 'ignore-by-default';
import picomatch from 'picomatch';
import slash from 'slash';

const defaultIgnorePatterns = [...ignoreByDefault.directories(), '**/node_modules'];
export {defaultIgnorePatterns};

const defaultPicomatchIgnorePatterns = [
	...defaultIgnorePatterns,
	// Unlike globby(), picomatch needs a complete pattern when ignoring directories.
	...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`),
];

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

export {processMatchingPatterns};

export function classify(file, {cwd, extensions, filePatterns}) {
	file = normalizeFileForMatching(cwd, file);
	return {
		isTest: hasExtension(extensions, file) && !isHelperish(file) && filePatterns.length > 0 && matches(file, filePatterns),
	};
}

export function hasExtension(extensions, file) {
	return extensions.includes(path.extname(file).slice(1));
}

export function isHelperish(file) { // Assume file has been normalized already.
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

export function matches(file, patterns) {
	const {match} = processMatchingPatterns(patterns);
	return match(file);
}

export function normalizeFileForMatching(cwd, file) {
	const rel = path.relative(cwd, file);
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		return slash(file);
	}

	return slash(rel);
}

export function normalizePattern(pattern) {
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

export function normalizePatterns(patterns) {
	return patterns.map(pattern => normalizePattern(pattern));
}
