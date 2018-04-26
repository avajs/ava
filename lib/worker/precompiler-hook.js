'use strict';
const fs = require('fs');
const path = require('path');
const sourceMapSupport = require('source-map-support');
const installPrecompiler = require('require-precompiled');
const options = require('./options').get();

const sourceMapCache = new Map();
const cacheDir = options.cacheDir;

function installSourceMapSupport() {
	sourceMapSupport.install({
		environment: 'node',
		handleUncaughtExceptions: false,
		retrieveSourceMap(source) {
			if (sourceMapCache.has(source)) {
				return {
					url: source,
					map: fs.readFileSync(sourceMapCache.get(source), 'utf8')
				};
			}
		}
	});
}

function install() {
	installSourceMapSupport();

	installPrecompiler(filename => {
		const precompiled = options.precompiled[filename];

		if (precompiled) {
			sourceMapCache.set(filename, path.join(cacheDir, `${precompiled}.js.map`));
			return fs.readFileSync(path.join(cacheDir, `${precompiled}.js`), 'utf8');
		}

		return null;
	});
}
exports.install = install;
