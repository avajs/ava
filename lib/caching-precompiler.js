'use strict';
const path = require('path');
const fs = require('fs');
const convertSourceMap = require('convert-source-map');
const cachingTransform = require('caching-transform');
const packageHash = require('package-hash');
const stripBomBuf = require('strip-bom-buf');
const autoBind = require('auto-bind');
const md5Hex = require('md5-hex');
const babelConfigHelper = require('./babel-config');

function CachingPrecompiler(options) {
	if (!(this instanceof CachingPrecompiler)) {
		throw new TypeError('Class constructor CachingPrecompiler cannot be invoked without \'new\'');
	}

	autoBind(this);

	options = options || {};

	this.babelConfig = babelConfigHelper.validate(options.babel);
	this.cacheDirPath = options.path;
	this.extensions = options.extensions || ['js'];
	this.powerAssert = Boolean(options.powerAssert);
	this.fileHashes = {};
	this.transform = this._createTransform();
}

module.exports = CachingPrecompiler;

CachingPrecompiler.prototype.precompileFile = function (filePath) {
	if (!this.fileHashes[filePath]) {
		const source = stripBomBuf(fs.readFileSync(filePath));

		this.transform(source, filePath);
	}

	return this.fileHashes[filePath];
};

// conditionally called by caching-transform when precompiling is required
CachingPrecompiler.prototype._init = function () {
	this.babel = require('babel-core');

	return this._transform;
};

CachingPrecompiler.prototype._transform = function (code, filePath, hash) {
	code = code.toString();

	var fileExt = path.extname(filePath).replace(/^\./, '');
	var isCustomExt = this.extensions.filter(function (ext) {
		return (ext !== 'js' && ext === fileExt);
	}).length > 0;

	var result;

	if (isCustomExt) {
		switch (fileExt) {
			case 'ts':
				var extTs = require('./ext/ts');
				result = extTs.transpile(code, filePath);
				break;

			default:
				throw new Error('`--extension ' + fileExt + '` is not supported by AVA.');
		}
	}

	if (!result) {
		var options = babelConfigHelper.build(this.babelConfig, this.powerAssert, filePath, code);
		result = this.babel.transform(code, options);
	}

	// save source map
	var mapPath = path.join(this.cacheDirPath, hash + '.js.map');
	fs.writeFileSync(mapPath, JSON.stringify(result.map));

	// append source map comment to transformed code
	// so that other libraries (like nyc) can find the source map
	var dirPath = path.dirname(filePath);
	var relativeMapPath = path.relative(dirPath, mapPath);
	var comment = convertSourceMap.generateMapFileComment(relativeMapPath);

	return `${result.code}\n${comment}`;
};

CachingPrecompiler.prototype._createTransform = function () {
	const pluginPackages = babelConfigHelper.pluginPackages;
	const avaPackage = require.resolve('../package.json');
	const packages = [avaPackage].concat(pluginPackages);

	const majorNodeVersion = process.version.split('.')[0];
	const babelConfig = JSON.stringify(this.babelConfig);
	const packageSalt = babelConfig + majorNodeVersion;

	const salt = packageHash.sync(packages, packageSalt);

	return cachingTransform({
		factory: this._init,
		cacheDir: this.cacheDirPath,
		hash: this._generateHash,
		salt,
		ext: '.js'
	});
};

CachingPrecompiler.prototype._generateHash = function (code, filePath, salt) {
	const hash = md5Hex([code, filePath, salt]);
	this.fileHashes[filePath] = hash;

	return hash;
};
