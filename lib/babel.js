'use strict';

var resolveFrom = require('resolve-from');
var createEspowerPlugin = require('babel-plugin-espower/create');

var hasGenerators = parseInt(process.version.slice(1), 10) > 0;

var options = {
	only: /(test|test\-.+|test\/.+)\.js$/,
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator'] : [],
	plugins: [
		createEspowerPlugin(require('babel-core'), {
			patterns: [
				't.ok(value, [message])'
			]
		})
	]
};

try {
	var localBabel = resolveFrom('.', 'babel-core/register') || resolveFrom('.', 'babel/register');

	require(localBabel)(options);
} catch (err) {
	require('babel-core/register')(options);
}

var path = process.argv[2];

require(path);
