'use strict';
var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');
var requireFromString = require('require-from-string');

var hasGenerators = parseInt(process.version.slice(1), 10) > 0;
var testPath = process.argv[2];
var babel;

try {
	var localBabel = resolveFrom('.', 'babel-core') || resolveFrom('.', 'babel');
	babel = require(localBabel);
} catch (err) {
	babel = require('babel-core');
}

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator', 'runtime'] : ['runtime'],
	plugins: [
		createEspowerPlugin(babel, {
			patterns: require('./enhance-assert').PATTERNS
		})
	]
};

var avaRequired;

module.exports = {
	avaRequired: function () {
		avaRequired = true;
	}
};

var transpiled = babel.transformFileSync(testPath, options);
requireFromString(transpiled.code, testPath, {
	appendPaths: module.paths
});

if (!avaRequired) {
	console.error('No tests found in ' + testPath + ', make sure to import "ava" at the top of your test file');
	setImmediate(function () {
		process.exit(1);
	});
}

process.on('message', function (message) {
	if (message['ava-kill-command']) {
		process.exit(0);
	}
});
