'use strict';
const normalizeExtensions = require('./lib/extensions');
const {classify, hasExtension, isHelperish, matches, normalizeFileForMatching, normalizeGlobs, normalizePatterns} = require('./lib/globs');
const loadConfig = require('./lib/load-config');
const providerManager = require('./lib/provider-manager');

const configCache = new Map();
const helperCache = new Map();

function load(projectDir, overrides) {
	const cacheKey = `${JSON.stringify(overrides)}\n${projectDir}`;
	if (helperCache.has(cacheKey)) {
		return helperCache.get(cacheKey);
	}

	let conf;
	let providers;
	if (configCache.has(projectDir)) {
		({conf, providers} = configCache.get(projectDir));
	} else {
		conf = loadConfig({resolveFrom: projectDir});

		providers = [];
		if (Reflect.has(conf, 'babel')) {
			const {level, main} = providerManager.babel(projectDir);
			providers.push({
				level,
				main: main({config: conf.babel}),
				type: 'babel'
			});
		}

		if (Reflect.has(conf, 'typescript')) {
			const {level, main} = providerManager.typescript(projectDir);
			providers.push({
				level,
				main: main({config: conf.typescript}),
				type: 'typescript'
			});
		}

		configCache.set(projectDir, {conf, providers});
	}

	const extensions = overrides && overrides.extensions ?
		normalizeExtensions(overrides.extensions) :
		normalizeExtensions(conf.extensions, providers);

	let helperPatterns = [];
	if (overrides && overrides.helpers !== undefined) {
		if (!Array.isArray(overrides.helpers) || overrides.helpers.length === 0) {
			throw new Error('The ’helpers’ override must be an array containing glob patterns.');
		}

		helperPatterns = normalizePatterns(overrides.helpers);
	}

	const globs = {
		cwd: projectDir,
		...normalizeGlobs({
			extensions,
			files: overrides && overrides.files ? overrides.files : conf.files,
			providers
		})
	};

	const classifyForESLint = file => {
		const {isTest} = classify(file, globs);
		let isHelper = false;
		if (!isTest && hasExtension(globs.extensions, file)) {
			file = normalizeFileForMatching(projectDir, file);
			isHelper = isHelperish(file) || (helperPatterns.length > 0 && matches(file, helperPatterns));
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
