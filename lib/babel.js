'use strict';
var unsafeResolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var path = require('path');
var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var testFile = process.argv[2];

function resolveFrom(dir, p) {
	try {
		return unsafeResolveFrom(dir, p);
	} catch (e) {}
}

var babelPath = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel') || require.resolve('babel-core');
var babel = require(babelPath);

var rtp1 = 'babel-runtime/regenerator';
var rtp2 = 'regenerator/runtime-module';
var rtp3 = 'babel-core/node_modules/regenerator/runtime-module';
var babelDir = path.dirname(babelPath);
var runtimePath = resolveFrom('.', rtp1) || resolveFrom('.', rtp2) || resolveFrom('.', rtp3) || resolveFrom(babelDir, rtp1) || resolveFrom(babelDir, rtp2) || resolveFrom(babelDir, rtp3) || require.resolve(rtp1);
var bluebirdPath = require.resolve('bluebird');

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator'] : [],
	plugins: [
		createEspowerPlugin(babel, {
			patterns: require('./enhance-assert').PATTERNS
		})
	]
};

var transpiled = babel.transformFileSync(testFile, options);

var code = [
	'var regeneratorRuntime=require("',
	runtimePath,
	'"); var Promise=require("',
	bluebirdPath,
	'"); (function(){',
	transpiled.code,
	'})()'
].join('');

requireFromString(code, testFile);
