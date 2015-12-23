var cachingTransform = require('caching-transform');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var cacheDir = path.join(module.paths[1], '.cache', 'ava');
var filenameToHash = {};

function factory(cacheDir) {
	var createEspowerPlugin = require('babel-plugin-espower/create');
	var babel = require('babel-core');
	var enhanceAssert = require('./enhance-assert');

	var convertSourceMap = require('convert-source-map');
	var presetStage2 = require('babel-preset-stage-2');
	var presetES2015 = require('babel-preset-es2015');
	var transformRuntime = require('babel-plugin-transform-runtime');

	// initialize power-assert
	var powerAssert = createEspowerPlugin(babel, {
		patterns: enhanceAssert.PATTERNS
	});

	function buildOptions(filename, code) {
		var sourceMap = convertSourceMap.fromSource(code) || convertSourceMap.fromMapFileSource(code, path.dirname(filename));

		return {
			presets: [presetStage2, presetES2015],
			plugins: [powerAssert, transformRuntime],
			filename: filename,
			sourceMaps: true,
			ast: false,
			inputSourceMap: sourceMap && sourceMap.toObject()
		};
	}

	return function (code, filename, hash) {
		var options = buildOptions(filename, code);
		var result = babel.transform(code, options);
		var mapFile = path.join(cacheDir, hash + '.map');
		fs.writeFileSync(mapFile, JSON.stringify(result.map));
		return result.code;
	};
}

var transform = cachingTransform({
	factory: factory,
	cacheDir: cacheDir,
	ext: '.js',
	hash: function (code, filename, salt) {
		var hash = crypto
			.createHash('md5')
			.update(code, 'utf8')
			.update(filename || 'unknown file', 'utf8')
			.update(salt || '', 'utf8')
			.digest('hex');

		filenameToHash[filename] = hash;

		return hash;
	}
});

module.exports = function (filename) {
	if (!filenameToHash[filename]) {
		transform(fs.readFileSync(filename, 'utf8'), filename);
	}
	return filenameToHash[filename];
};
