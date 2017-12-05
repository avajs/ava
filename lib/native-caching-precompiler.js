'use strict';
const fs = require('fs');
const cachingTransform = require('caching-transform');
const packageHash = require('package-hash');
const stripBomBuf = require('strip-bom-buf');
const autoBind = require('auto-bind');
const md5Hex = require('md5-hex');

class NativeCachingPrecompiler {

	constructor(options) {
		autoBind(this);
		this.babelCacheKeys = options.babelCacheKeys;
		this.cacheDirPath = options.path;
		this.fileHashes = {};
		this.transform = cachingTransform({
			cacheDir: this.cacheDirPath,
			ext: '.js',
			factory: () => code => code.toString(), // Native raw
			salt: packageHash.sync([require.resolve('../package.json')], this.babelCacheKeys),
			hash: (code, filePath, salt) => {
				const hash = md5Hex([code, filePath, salt]);
				this.fileHashes[filePath] = hash;
				return hash;
			}
		});
	}

	precompileFile(filePath) {
		if (!this.fileHashes[filePath]) {
			const source = stripBomBuf(fs.readFileSync(filePath));
			this.transform(source, filePath);
		}

		return this.fileHashes[filePath];
	}
}

module.exports = NativeCachingPrecompiler;
