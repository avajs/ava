'use strict';
var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var path = process.argv[2];

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator'] : [],
	plugins: [
		createEspowerPlugin(require('babel-core'), {
			patterns: require('./enhance-assert').PATTERNS
		})
	]
};

var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

var transpiled = babel.transformFileSync(path, options);
requireFromString(transpiled.code, path);
