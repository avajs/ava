'use strict';
var fs = require('fs');
var path = require('path');
var findCacheDir = require('find-cache-dir');
var md5hex = require('md5-hex');
var pirates = require('pirates');

function runTest(opts) {
	var testPath = opts.testPath;
	var code = fs.readFileSync(testPath);
	var hash = md5hex(code);

	var cacheDir = findCacheDir({name: 'ava', create: true});
	var cachedFile = path.join(cacheDir, hash + '.js');
	if (!fs.existsSync(cachedFile)) {
		return opts.loadWorker().runTest(testPath, opts.babelConfig);
	}

	var revert = pirates.addHook(
		function () {
			return fs.readFileSync(cachedFile, 'utf8');
		},
		{
			exts: [path.extname(testPath)],
			matcher: function (filename) {
				return filename === testPath;
			}
		}
	);
	require(testPath); // eslint-disable-line import/no-dynamic-require
	revert();
}
exports.runTest = runTest;
