'use strict';
var fs = require('fs');
var path = require('path');

var babel = require('babel-core');
var js = require('default-require-extensions/js');
var findCacheDir = require('find-cache-dir');
var md5hex = require('md5-hex');
var objectAssign = require('object-assign');

function runTest(testPath, babelConfig) {
	var options = objectAssign({
		filename: testPath,
		sourceMaps: true,
		ast: false,
		babelrc: false
	}, babelConfig);

	var start = Date.now();
	var code = fs.readFileSync(testPath, 'utf8');
	var result = babel.transform(code, options);
	console.error('transformation took', Date.now() - start);

	var hash = md5hex(code);
	var cacheDir = findCacheDir({name: 'ava', create: true});
	var cachedFile = path.join(cacheDir, hash + '.js');
	fs.writeFileSync(cachedFile, result.code);

	// Guard against babel-core/register overriding the default extension.
	var oldExtension = require.extensions['.js'];
	require.extensions['.js'] = function (module, filename) {
		if (filename !== testPath) {
			return oldExtension(module, filename);
		}

		require.extensions['.js'] = oldExtension;
		var oldCompile = module._compile;
		module._compile = function () {
			module._compile = oldCompile;
			module._compile(result.code, testPath);
		};

		js(module, testPath);
	};
	require(testPath); // eslint-disable-line import/no-dynamic-require
}
exports.runTest = runTest;
