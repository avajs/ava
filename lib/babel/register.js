'use strict';

var fs = require('fs');
var path = require('path');
var js = require('default-require-extensions/js');
var findCacheDir = require('find-cache-dir');
var md5hex = require('md5-hex');

var babel;
function install() {
	var cacheDir = findCacheDir({name: 'ava', create: true});

	require.extensions['.js'] = function (module, filename) {
		if (/node_modules/.test(filename)) {
			return js(module, filename);
		}

		var oldCompile = module._compile;
		module._compile = function (code, filename) {
			module._compile = oldCompile;

			var hash = md5hex(code);
			var cachedFile = path.join(cacheDir, hash + '.js');
			if (fs.existsSync(cachedFile)) {
				module._compile(fs.readFileSync(cachedFile, 'utf8'), filename);
			} else {
				if (!babel) {
					// TODO: Load from the bundle instead!
					babel = require('babel-core');
				}

				var result = babel.transform(code, {
					filename: filename,
					sourceMaps: true,
					ast: false,
					babelrc: true
				});
				fs.writeFileSync(cachedFile, result.code);
				module._compile(result.code, filename);
			}
		};

		return js(module, filename);
	};
}
exports.install = install;
