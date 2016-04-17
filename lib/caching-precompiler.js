'use strict';
var path = require('path');
var fs = require('fs');
var convertSourceMap = require('convert-source-map');
var cachingTransform = require('caching-transform');
var objectAssign = require('object-assign');
var stripBom = require('strip-bom');
var md5Hex = require('md5-hex');
var packageHash = require('package-hash');
var enhanceAssert = require('./enhance-assert');

function CachingPrecompiler(cacheDirPath, babelConfig) {
	if (!(this instanceof CachingPrecompiler)) {
		throw new TypeError('Class constructor CachingPrecompiler cannot be invoked without \'new\'');
	}

	this.babelConfig = babelConfig || 'default';
	this.cacheDirPath = cacheDirPath;
	this.fileHashes = {};

	Object.keys(CachingPrecompiler.prototype).forEach(function (name) {
		this[name] = this[name].bind(this);
	}, this);

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
CachingPrecompiler.prototype._factory = function () {
	this._init();

	return this._transform;
};

CachingPrecompiler.prototype._init = function () {
	this.babel = require('babel-core');

	this.defaultPresets = [
		require('babel-preset-stage-2'),
		require('babel-preset-es2015')
	];

	var transformRuntime = require('babel-plugin-transform-runtime');
	var throwsHelper = require('babel-plugin-ava-throws-helper');
	var rewriteBabelPaths = this._createRewritePlugin();
	var powerAssert = this._createEspowerPlugin();

	this.defaultPlugins = [
		powerAssert,
		throwsHelper,
		rewriteBabelPaths,
		transformRuntime
	];
};

CachingPrecompiler.prototype._transform = function (code, filePath, hash) {
	code = code.toString();

	var options = this._buildOptions(filePath, code);
	var result = this.babel.transform(code, options);

	// save source map
	var mapPath = path.join(this.cacheDirPath, hash + '.js.map');
	fs.writeFileSync(mapPath, JSON.stringify(result.map));

	// When loading the test file, test workers intercept the require call and
	// load the cached code instead. Libraries like nyc may also be intercepting
	// require calls, however they won't know that different code was loaded.
	// They may then attempt to resolve a source map from the original file
	// location.
	//
	// Add a source map file comment to the cached code. The file path is
	// relative from the directory of the original file to where the source map
	// is cached. This will allow the source map to be resolved.
	var dirPath = path.dirname(filePath);
	var relativeMapPath = path.relative(dirPath, mapPath);
	var comment = convertSourceMap.generateMapFileComment(relativeMapPath);

	return result.code + '\n' + comment;
};

CachingPrecompiler.prototype._buildOptions = function (filePath, code) {
	var options = {babelrc: false};

	if (this.babelConfig === 'default') {
		objectAssign(options, {presets: this.defaultPresets});
	} else if (this.babelConfig === 'inherit') {
		objectAssign(options, {babelrc: true});
	} else {
		objectAssign(options, this.babelConfig);
	}

	var sourceMap = this._getSourceMap(filePath, code);

	objectAssign(options, {
		inputSourceMap: sourceMap,
		filename: filePath,
		sourceMaps: true,
		ast: false
	});

	options.plugins = (options.plugins || []).concat(this.defaultPlugins);

	return options;
};

CachingPrecompiler.prototype._getSourceMap = function (filePath, code) {
	var sourceMap = convertSourceMap.fromSource(code);

	if (!sourceMap) {
		var dirPath = path.dirname(filePath);

		sourceMap = convertSourceMap.fromMapFileSource(code, dirPath);
	}

	if (sourceMap) {
		sourceMap = sourceMap.toObject();
	}

	return sourceMap;
};

CachingPrecompiler.prototype._createRewritePlugin = function () {
	var wrapListener = require('babel-plugin-detective/wrap-listener');

	return wrapListener(this._rewriteBabelRuntimePaths, 'rewrite-runtime', {
		generated: true,
		require: true,
		import: true
	});
};

CachingPrecompiler.prototype._rewriteBabelRuntimePaths = function (path) {
	var isBabelPath = /^babel-runtime[\\\/]?/.test(path.node.value);

	if (path.isLiteral() && isBabelPath) {
		path.node.value = require.resolve(path.node.value);
	}
};

CachingPrecompiler.prototype._createEspowerPlugin = function () {
	var createEspowerPlugin = require('babel-plugin-espower/create');

	// initialize power-assert
	return createEspowerPlugin(this.babel, {
		patterns: enhanceAssert.PATTERNS
	});
};

CachingPrecompiler.prototype._createTransform = function () {
	var salt = packageHash.sync([
		require.resolve('../package.json'),
		require.resolve('babel-core/package.json'),
		require.resolve('babel-plugin-espower/package.json')
	], JSON.stringify(this.babelConfig));

	return cachingTransform({
		factory: this._factory,
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
