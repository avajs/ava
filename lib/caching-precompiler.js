var fs = require('fs');
var path = require('path');
var cachingTransform = require('caching-transform');
var md5Hex = require('md5-hex');
var stripBom = require('strip-bom');
var objectAssign = require('object-assign');

module.exports = CachingPrecompiler;

function CachingPrecompiler(cacheDir, babelConfig) {
	if (!(this instanceof CachingPrecompiler)) {
		throw new TypeError('Class constructor CachingPrecompiler cannot be invoked without \'new\'');
	}

	this.cacheDir = cacheDir;
	this.filenameToHash = {};
	this.transform = this._createTransform(babelConfig);
}

CachingPrecompiler.prototype._factory = function (babelConfig, cacheDir) {
	// This factory method is only called once per process, and only as needed, to defer loading expensive dependencies.
	var babel = require('babel-core');
	var convertSourceMap = require('convert-source-map');
	var presetStage2 = require('babel-preset-stage-2');
	var presetES2015 = require('babel-preset-es2015');
	var transformRuntime = require('babel-plugin-transform-runtime');

	var powerAssert = this._createEspowerPlugin(babel);

	function buildOptions(filename, code) {
		// Extract existing source maps from the code.
		var sourceMap = convertSourceMap.fromSource(code) || convertSourceMap.fromMapFileSource(code, path.dirname(filename));

		var options = {babelrc: false};

		if (!babelConfig || babelConfig === 'default') {
			objectAssign(options, {presets: [presetStage2, presetES2015]});
		} else if (babelConfig === 'inherit') {
			objectAssign(options, {babelrc: true});
		} else {
			objectAssign(options, babelConfig);
		}

		objectAssign(options, {
			inputSourceMap: sourceMap && sourceMap.toObject(),
			filename: filename,
			sourceMaps: true,
			ast: false
		});

		options.plugins = options.plugins || [];
		options.plugins.push(powerAssert, transformRuntime);

		return options;
	}

	return function (code, filename, hash) {
		code = code.toString();
		var options = buildOptions(filename, code);
		var result = babel.transform(code, options);
		var mapFile = path.join(cacheDir, hash + '.map');
		fs.writeFileSync(mapFile, JSON.stringify(result.map));
		return result.code;
	};
};

CachingPrecompiler.prototype._createEspowerPlugin = function (babel) {
	var createEspowerPlugin = require('babel-plugin-espower/create');
	var enhanceAssert = require('./enhance-assert');

	// initialize power-assert
	return createEspowerPlugin(babel, {
		patterns: enhanceAssert.PATTERNS
	});
};

CachingPrecompiler.prototype._createTransform = function (babelConfig) {
	return cachingTransform({
		factory: this._factory.bind(this, babelConfig),
		cacheDir: this.cacheDir,
		salt: new Buffer(JSON.stringify({
			'babel-plugin-espower': require('babel-plugin-espower/package.json').version,
			'ava': require('../package.json').version,
			'babel-core': require('babel-core/package.json').version,
			'babelConfig': babelConfig
		})),
		ext: '.js',
		hash: this._hash.bind(this)
	});
};

CachingPrecompiler.prototype._hash = function (code, filename, salt) {
	var hash = md5Hex([code, filename, salt]);
	this.filenameToHash[filename] = hash;
	return hash;
};

CachingPrecompiler.prototype.precompileFile = function (filename) {
	if (!this.filenameToHash[filename]) {
		this.transform(stripBom(fs.readFileSync(filename)), filename);
	}

	return this.filenameToHash[filename];
};

CachingPrecompiler.prototype.generateHashForFile = function (filename) {
	var hash = {};
	hash[filename] = this.precompileFile(filename);
	return hash;
};
