'use strict';
var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');
var fs = require('fs');
var join = require('path').join;
var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var path = process.argv[2];

var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator'] : [],
	plugins: [
		createEspowerPlugin(babel, {
			patterns: require('./enhance-assert').PATTERNS
		})
	]
};

var transpiled = babel.transformFileSync(path, options);

if (!hasGenerators) {
	var runtime = fs.readFileSync(join(__dirname, '/regeneratorRuntime.js'));
	transpiled.code = runtime + '\n' + transpiled.code;
}

requireFromString(transpiled.code, path);
