'use strict';
const babelPipeline = require('./lib/babel-pipeline');
const normalizeExtensions = require('./lib/extensions');
const {hasExtension, normalizeGlobs, classify} = require('./lib/globs');
const loadConfig = require('./lib/load-config');

const cache = new Map();

function load(projectDir) {
	if (cache.has(projectDir)) {
		return cache.get(projectDir);
	}

	const conf = loadConfig(projectDir);
	const babelConfig = babelPipeline.validate(conf.babel);
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
	cache.set(projectDir, helper);
	return helper;
}

exports.load = load;
