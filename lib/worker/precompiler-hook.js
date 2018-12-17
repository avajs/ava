'use strict';
const fs = require('fs');
const sourceMapSupport = require('source-map-support');
const installPrecompiler = require('require-precompiled');
const options = require('./options').get();

function installSourceMapSupport() {
	sourceMapSupport.install({
		environment: 'node',
		handleUncaughtExceptions: false,
		retrieveSourceMap(url) {
			const precompiled = options.precompiled[url];
			if (!precompiled) {
				return null;
			}

			try {
				const map = fs.readFileSync(`${precompiled}.map`, 'utf8');
				return {url, map};
			} catch (error) {
				if (error.code === 'ENOENT') {
					return null;
				}

				throw error;
			}
		}
	});
}

function install() {
	installSourceMapSupport();

	installPrecompiler(filename => {
		const precompiled = options.precompiled[filename];
		return precompiled ?
			fs.readFileSync(precompiled, 'utf8') :
			null;
	});
}

exports.install = install;
