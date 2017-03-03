'use strict';
const path = require('path');
const fs = require('fs');
const convertSourceMap = require('convert-source-map');
const cachingTransform = require('caching-transform');
const packageHash = require('package-hash');
const stripBomBuf = require('strip-bom-buf');
const autoBind = require('auto-bind');
const md5Hex = require('md5-hex');

function getSourceMap(filePath, code) {
	let sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		const dirPath = path.dirname(filePath);
		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	if (sourceMap) {
		sourceMap = sourceMap.toObject();
	}

	return sourceMap;
}

class CachingPrecompiler {
	constructor(options) {
		autoBind(this);

		this.getBabelOptions = options.getBabelOptions;
		this.babelCacheKeys = options.babelCacheKeys;
		this.cacheDirPath = options.path;
		this.fileHashes = {};
		this.transform = this._createTransform();
	}
	precompileFile(filePath) {
		if (!this.fileHashes[filePath]) {
			const source = stripBomBuf(fs.readFileSync(filePath));
			this.transform(source, filePath);
		}

		return this.fileHashes[filePath];
	}
	// Conditionally called by caching-transform when precompiling is required
	_init() {
		this.babel = require('babel-core');
		return this._transform;
	}
	_transform(code, filePath, hash) {
		code = code.toString();

		let result;
		const originalBabelDisableCache = process.env.BABEL_DISABLE_CACHE;
		try {
			// Disable Babel's cache. AVA has good cache management already.
			process.env.BABEL_DISABLE_CACHE = '1';

			result = this.babel.transform(code, Object.assign(this.getBabelOptions(), {
				inputSourceMap: getSourceMap(filePath, code),
				filename: filePath,
				sourceMaps: true,
				ast: false
			}));
		} finally {
			// Restore the original value. It is passed to workers, where users may
			// not want Babel's cache to be disabled.
			process.env.BABEL_DISABLE_CACHE = originalBabelDisableCache;
		}

		// Save source map
		const mapPath = path.join(this.cacheDirPath, `${hash}.js.map`);
		fs.writeFileSync(mapPath, JSON.stringify(result.map));

		// Append source map comment to transformed code
		// So that other libraries (like nyc) can find the source map
		const dirPath = path.dirname(filePath);
		const relativeMapPath = path.relative(dirPath, mapPath);
		const comment = convertSourceMap.generateMapFileComment(relativeMapPath);

		return `${result.code}\n${comment}`;
	}
	_createTransform() {
		const salt = packageHash.sync([
			require.resolve('../package.json'),
			require.resolve('babel-core/package.json')
		], this.babelCacheKeys);

		return cachingTransform({
			factory: this._init,
			cacheDir: this.cacheDirPath,
			hash: this._generateHash,
			salt,
			ext: '.js'
		});
	}
	_generateHash(code, filePath, salt) {
		const hash = md5Hex([code, filePath, salt]);
		this.fileHashes[filePath] = hash;
		return hash;
	}
}

module.exports = CachingPrecompiler;
