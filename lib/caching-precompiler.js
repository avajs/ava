'use strict';
var path = require('path');
var fs = require('fs');
var convertSourceMap = require('convert-source-map');
var cachingTransform = require('caching-transform');
var stripBom = require('strip-bom');
var md5Hex = require('md5-hex');
var packageHash = require('package-hash');
var babelConfigHelper = require('./babel-config');

function CachingPrecompiler(cacheDirPath, babelConfig) {
	if (!(this instanceof CachingPrecompiler)) {
		throw new TypeError('Class constructor CachingPrecompiler cannot be invoked without \'new\'');
	}

	this.babelConfig = babelConfigHelper.validate(babelConfig);
	this.cacheDirPath = cacheDirPath;
	this.fileHashes = {};
	this.detectiveMetadataResults = {};

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
	this.detective = require('babel-plugin-detective');
};

CachingPrecompiler.prototype._transform = function (code, filePath, hash) {
	code = code.toString();

	var options = babelConfigHelper.build(this.babelConfig, filePath, code);
	var result = this.babel.transform(code, options);

	// save source map
	var mapPath = this._cachePath(hash + '.js.map');
	fs.writeFileSync(mapPath, JSON.stringify(result.map));

	// save detective results
	var detectiveMetadata = this.detective.metadata(result) || {};
	var serializableDetectiveMetadata = {
		strings: detectiveMetadata.strings || [],
		expressions: Boolean(detectiveMetadata.expressions && detectiveMetadata.expressions.length)
	};
	var detectiveResultsPath = this._cachePath(hash + '.detective.json');
	fs.writeFileSync(detectiveResultsPath, JSON.stringify(serializableDetectiveMetadata));
	this.detectiveMetadataResults[hash] = serializableDetectiveMetadata;

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

CachingPrecompiler.prototype._cachePath = function (filename) {
	return path.join(this.cacheDirPath, filename);
};

CachingPrecompiler.prototype._createTransform = function () {
	var salt = packageHash.sync(
		[require.resolve('../package.json')].concat(babelConfigHelper.pluginPackages),
		JSON.stringify(this.babelConfig)
	);

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

CachingPrecompiler.prototype.getDetectiveMetadata = function (hash) {
	var metadata = this.detectiveMetadataResults[hash];

	if (!metadata) {
		metadata = JSON.parse(fs.readFileSync(this._cachePath(hash + '.detective.json'), 'utf8'));
		this.detectiveMetadataResults[hash] = metadata;
	}

	return metadata;
};
