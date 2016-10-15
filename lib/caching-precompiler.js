'use strict';
var path = require('path');
var fs = require('fs');
var convertSourceMap = require('convert-source-map');
var cachingTransform = require('caching-transform');
var packageHash = require('package-hash');
var stripBom = require('strip-bom');
var autoBind = require('auto-bind');
var md5Hex = require('md5-hex');
var babelConfigHelper = require('./babel-config');

function CachingPrecompiler(options) {
	if (!(this instanceof CachingPrecompiler)) {
		throw new TypeError('Class constructor CachingPrecompiler cannot be invoked without \'new\'');
	}

	autoBind(this);

	options = options || {};

	this.babelConfig = babelConfigHelper.validate(options.babel);
	this.cacheDirPath = options.path;
	this.powerAssert = Boolean(options.powerAssert);
	this.fileHashes = {};

	this.transform = this._createTransform();
}

module.exports = CachingPrecompiler;

CachingPrecompiler.prototype.precompileFile = function (filePath) {
	if (!this.fileHashes[filePath]) {
		var source = stripBom(fs.readFileSync(filePath));

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

	var options = babelConfigHelper.build(this.babelConfig, this.powerAssert, filePath, code);
	var result = this.babel.transform(code, options);

	// save source map
	var mapPath = path.join(this.cacheDirPath, hash + '.js.map');
	fs.writeFileSync(mapPath, JSON.stringify(result.map));

	// append source map comment to transformed code
	// so that other libraries (like nyc) can find the source map
	var dirPath = path.dirname(filePath);
	var relativeMapPath = path.relative(dirPath, mapPath);
	var comment = convertSourceMap.generateMapFileComment(relativeMapPath);

	return result.code + '\n' + comment;
};

CachingPrecompiler.prototype._createTransform = function () {
	var pluginPackages = babelConfigHelper.pluginPackages;
	var avaPackage = require.resolve('../package.json');
	var packages = [avaPackage].concat(pluginPackages);

	var majorNodeVersion = process.version.split('.')[0];
	var babelConfig = JSON.stringify(this.babelConfig);
	var packageSalt = babelConfig + majorNodeVersion;

	var salt = packageHash.sync(packages, packageSalt);

	return cachingTransform({
		factory: this._init,
		cacheDir: this.cacheDirPath,
		hash: this._generateHash,
		salt: salt,
		ext: '.js'
	});
};

CachingPrecompiler.prototype._generateHash = function (code, filePath, salt) {
	var hash = md5Hex([code, filePath, salt]);
	this.fileHashes[filePath] = hash;

	return hash;
};
