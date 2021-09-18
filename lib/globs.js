import path from 'node:path';

import {globby} from 'globby';

import {
	classify,
	defaultIgnorePatterns,
	hasExtension,
	isHelperish,
	matches,
	normalizeFileForMatching,
	normalizePattern,
	normalizePatterns,
} from './glob-helpers.cjs';

export {
	classify,
	defaultIgnorePatterns,
	hasExtension,
	isHelperish,
	matches,
	normalizeFileForMatching,
	normalizePattern,
	normalizePatterns,
};

const defaultIgnoredByWatcherPatterns = [
	'**/*.snap.md', // No need to rerun tests when the Markdown files change.
	'ava.config.js', // Config is not reloaded so avoid rerunning tests when it changes.
	'ava.config.cjs', // Config is not reloaded so avoid rerunning tests when it changes.
];

const buildExtensionPattern = extensions => extensions.length === 1 ? extensions[0] : `{${extensions.join(',')}}`;

export function normalizeGlobs({extensions, files: filePatterns, ignoredByWatcher: ignoredByWatcherPatterns, providers}) {
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
		'!**/test?(s)/**/{helper,fixture}?(s)/**/*',
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

	for (const {main} of providers) {
		({filePatterns, ignoredByWatcherPatterns} = main.updateGlobs({filePatterns, ignoredByWatcherPatterns}));
	}

	return {extensions, filePatterns, ignoredByWatcherPatterns};
}

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
		unique: true,
	});

	// Return absolute file paths. This has the side-effect of normalizing paths
	// on Windows.
	return files.map(file => path.join(cwd, file));
};

export async function findFiles({cwd, extensions, filePatterns}) {
	return (await globFiles(cwd, filePatterns)).filter(file => hasExtension(extensions, file));
}

export async function findTests({cwd, extensions, filePatterns}) {
	return (await findFiles({cwd, extensions, filePatterns})).filter(file => !path.basename(file).startsWith('_'));
}

export function getChokidarIgnorePatterns({ignoredByWatcherPatterns}) {
	return [
		...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`),
		...ignoredByWatcherPatterns.filter(pattern => !pattern.startsWith('!')),
	];
}

export function applyTestFileFilter({cwd, filter, testFiles}) {
	return testFiles.filter(file => matches(normalizeFileForMatching(cwd, file), filter));
}
