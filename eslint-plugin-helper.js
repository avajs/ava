'use strict';
const babelManager = require('./lib/babel-manager');
const normalizeExtensions = require('./lib/extensions');
const {hasExtension, normalizeGlobs, classify} = require('./lib/globs');
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
			babelProvider = babelManager({projectDir});
			babelProvider.validateConfig(conf.babel);
		}

		configCache.set(projectDir, {conf, babelProvider});
	}

	if (overrides) {
		conf = {...conf, ...overrides};
		if (overrides.extensions) {
			// Ignore extensions from the Babel config. Assume all extensions are
			// provided in the override.
			babelProvider = undefined;
		}
	}

	const extensions = normalizeExtensions(conf.extensions, babelProvider);
	const globs = {cwd: projectDir, ...normalizeGlobs(conf.files, conf.helpers, conf.sources, extensions.all)};

	const helper = Object.freeze({
		classifyFile: file => classify(file, globs),
		classifyImport: importPath => {
			if (hasExtension(globs.extensions, importPath)) {
				// The importPath has one of the test file extensions: we can classify
				// it directly.
				return classify(importPath, globs);
			}

			// Add the first extension. If multiple extensions are available, assume
			// patterns are not biased to any particular extension.
			return classify(`${importPath}.${globs.extensions[0]}`, globs);
		}
	});
	helperCache.set(cacheKey, helper);
	return helper;
}

exports.load = load;
