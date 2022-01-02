import fs from 'node:fs';
import path from 'node:path';

import {globby, globbySync} from 'globby';

import {
	defaultIgnorePatterns,
	hasExtension,
	normalizeFileForMatching,
	normalizePatterns,
	processMatchingPatterns,
} from './glob-helpers.cjs';

export {
	classify,
	isHelperish,
	matches,
	normalizePattern,
	defaultIgnorePatterns,
	hasExtension,
	normalizeFileForMatching,
	normalizePatterns,
} from './glob-helpers.cjs';

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

const globOptions = {
	// Globs should work relative to the cwd value only (this should be the
	// project directory that AVA is run in).
	absolute: false,
	braceExpansion: true,
	caseSensitiveMatch: false,
	dot: false,
	expandDirectories: false,
	extglob: true,
	followSymbolicLinks: true,
	gitignore: false,
	globstar: true,
	ignore: defaultIgnorePatterns,
	baseNameMatch: false,
	stats: false,
	unique: true,
};

const globFiles = async (cwd, patterns) => {
	const files = await globby(patterns, {
		...globOptions,
		cwd,
		onlyFiles: true,
	});

	// Return absolute file paths. This has the side-effect of normalizing paths
	// on Windows.
	return files.map(file => path.join(cwd, file));
};

const globDirectoriesSync = (cwd, patterns) => {
	const files = globbySync(patterns, {
		...globOptions,
		cwd,
		onlyDirectories: true,
	});

	// Return absolute file paths. This has the side-effect of normalizing paths
	// on Windows.
	return files.map(file => path.join(cwd, file));
};

export async function findFiles({cwd, extensions, filePatterns}) {
	const files = await globFiles(cwd, filePatterns);
	return files.filter(file => hasExtension(extensions, file));
}

export async function findTests({cwd, extensions, filePatterns}) {
	const files = await findFiles({cwd, extensions, filePatterns});
	return files.filter(file => !path.basename(file).startsWith('_'));
}

export function getChokidarIgnorePatterns({ignoredByWatcherPatterns}) {
	return [
		...defaultIgnorePatterns.map(pattern => `${pattern}/**/*`),
		...ignoredByWatcherPatterns.filter(pattern => !pattern.startsWith('!')),
	];
}

export function applyTestFileFilter({ // eslint-disable-line complexity
	cwd,
	expandDirectories = true,
	filter,
	providers = [],
	testFiles,
	treatFilterPatternsAsFiles = true,
}) {
	const {individualMatchers} = processMatchingPatterns(filter);
	const normalizedFiles = testFiles.map(file => ({file, matcheable: normalizeFileForMatching(cwd, file)}));

	const selected = new Set();
	const unmatchedPatterns = new Set(individualMatchers.map(({pattern}) => pattern));

	for (const {pattern, match} of individualMatchers) {
		for (const {file, matcheable} of normalizedFiles) {
			if (match(matcheable)) {
				unmatchedPatterns.delete(pattern);
				selected.add(file);
			}
		}
	}

	if (expandDirectories && unmatchedPatterns.size > 0) {
		const expansion = [];
		for (const pattern of unmatchedPatterns) {
			const directories = globDirectoriesSync(cwd, pattern);
			if (directories.length > 0) {
				unmatchedPatterns.delete(pattern);
				expansion.push(directories);
			}
		}

		const directories = expansion.flat();
		if (directories.length > 0) {
			for (const file of testFiles) {
				if (selected.has(file)) {
					continue;
				}

				for (const dir of directories) {
					if (file.startsWith(dir + path.sep)) { // eslint-disable-line max-depth
						selected.add(file);
					}
				}
			}
		}
	}

	const ignoredFilterPatternFiles = [];
	if (treatFilterPatternsAsFiles && unmatchedPatterns.size > 0) {
		const providerExtensions = new Set(providers.flatMap(({main}) => main.extensions));
		for (const pattern of unmatchedPatterns) {
			const file = path.join(cwd, pattern);
			try {
				const stats = fs.statSync(file);
				if (!stats.isFile()) {
					continue;
				}
			} catch (error) {
				if (error.code === 'ENOENT') {
					continue;
				}

				throw error;
			}

			if (
				path.basename(file).startsWith('_')
				|| providerExtensions.has(path.extname(file).slice(1))
				|| file.split(path.sep).includes('node_modules')
			) {
				ignoredFilterPatternFiles.push(pattern);
				continue;
			}

			selected.add(file);
		}
	}

	return Object.assign([...selected], {ignoredFilterPatternFiles});
}
