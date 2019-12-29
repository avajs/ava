'use strict';
const path = require('path');
const babelManager = require('./lib/babel-manager');
const normalizeExtensions = require('./lib/extensions');
const {classify, hasExtension, matches, normalizeFileForMatching, normalizeGlobs, normalizePatterns} = require('./lib/globs');
const loadConfig = require('./lib/load-config');

const configCache = new Map();
const helperCache = new Map();

function load(projectDir, overrides) {
	const cacheKey = `${JSON.stringify(overrides)}\n${projectDir}`;
	if (helperCache.has(cacheKey)) {
		return helperCache.get(cacheKey);
	}

	let conf;
	let babelProvider;
	if (configCache.has(projectDir)) {
		({conf, babelProvider} = configCache.get(projectDir));
	} else {
		conf = loadConfig({resolveFrom: projectDir});

		if (Reflect.has(conf, 'babel')) {
			babelProvider = babelManager({projectDir}).main({config: conf.babel});
		}

		configCache.set(projectDir, {conf, babelProvider});
	}

	const extensions = overrides && overrides.extensions ?
		normalizeExtensions(overrides.extensions) :
		normalizeExtensions(conf.extensions, babelProvider);

	let helperPatterns = [];
	if (overrides && overrides.helpers !== undefined) {
		if (!Array.isArray(overrides.helpers) || overrides.helpers.length === 0) {
			throw new Error('The \'helpers\' override must be an array containing glob patterns.');
		}

		helperPatterns = normalizePatterns(overrides.helpers);
	}

	const globs = {
		cwd: projectDir,
		...normalizeGlobs({
			extensions,
			files: overrides && overrides.files ? overrides.files : conf.files
		})
	};

	const classifyForESLint = file => {
		const {isTest} = classify(file, globs);
		let isHelper = false;
		if (!isTest && hasExtension(globs.extensions, file)) {
			isHelper = path.basename(file).startsWith('_') || (helperPatterns.length > 0 && matches(normalizeFileForMatching(projectDir, file), helperPatterns));
		}

		return {isHelper, isTest};
	};

	const helper = Object.freeze({
		classifyFile: classifyForESLint,
		classifyImport: importPath => {
			if (hasExtension(globs.extensions, importPath)) {
				// The importPath has one of the test file extensions: we can classify
				// it directly.
				return classifyForESLint(importPath);
			}

			// Add the first extension. If multiple extensions are available, assume
			// patterns are not biased to any particular extension.
			return classifyForESLint(`${importPath}.${globs.extensions[0]}`);
		}
	});
	helperCache.set(cacheKey, helper);
	return helper;
}

exports.load = load;
