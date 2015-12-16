var createEspowerPlugin = require('babel-plugin-espower/create');
var sourceMapSupport = require('source-map-support');
var babel = require('babel-core');
var Promise = require('bluebird');
var tempWrite = require('temp-write');
var transformFile = Promise.promisify(babel.transformFile);
var enhanceAssert = require('./enhance-assert');

var cache = {};

module.exports = precompile;

function precompile(testPath) {
	return cache[testPath] || (cache[testPath] = _precompile(testPath));
}

function _precompile(testPath) {
	// initialize power-assert
	var powerAssert = createEspowerPlugin(babel, {
		patterns: enhanceAssert.PATTERNS
	});

	// if generators are not supported, use regenerator
	var options = {
		presets: [require('babel-preset-stage-2'), require('babel-preset-es2015')],
		plugins: [powerAssert, require('babel-plugin-transform-runtime')],
		sourceMaps: true,
		ast: false,
		inputSourceMap: null
	};

	// try to load an input source map for the test file, in case the file was
	// already compiled once by the user
	var inputSourceMap = sourceMapSupport.retrieveSourceMap(testPath);
	if (inputSourceMap) {
		// source-map-support returns the source map as a json-encoded string, but
		// babel requires an actual object
		options.inputSourceMap = JSON.parse(inputSourceMap.map);
	}

	return transformFile(testPath, options)
		.then(function (result) {
			return Promise.all([
				tempWrite(result.code, testPath),
				tempWrite(JSON.stringify(result.map), testPath + '.map')
			])
				.spread(function (tempPath, mapPath) {
					result.mapPath = mapPath;
					result.tempPath = tempPath;
					result.testPath = testPath;
					return result;
				});
		});
}

