'use strict';
const babelPipeline = require('./lib/babel-pipeline');
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
	let babelConfig;
	if (configCache.has(projectDir)) {
		({conf, babelConfig} = configCache.get(projectDir));
	} else {
		conf = loadConfig({resolveFrom: projectDir});
		babelConfig = babelPipeline.validate(conf.babel);
		configCache.set(projectDir, {conf, babelConfig});
	}

	if (overrides) {
		conf = {...conf, ...overrides};
		if (overrides.extensions) {
			// Ignore extensions from the Babel config. Assume all extensions are
			// provided in the override.
			babelConfig = null;
		}
	}

	const extensions = normalizeExtensions(conf.extensions || [], babelConfig);
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
