'use strict';
var fs = require('fs');
var path = require('path');

var babel = require('babel-core');
var objectAssign = require('object-assign');
var pirates = require('pirates');

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

	var revert = pirates.addHook(
		function () {
			return result.code;
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
