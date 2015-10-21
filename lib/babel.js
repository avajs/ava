'use strict';

var resolveFrom = require('resolve-from');

var hasGenerators = parseInt(process.version.slice(1), 10) > 0;

var isTestFilesOnly = process.argv.indexOf('--es-src') === -1;

var options = {
	blacklist: hasGenerators ? ['regenerator'] : [],
	optional: hasGenerators ? ['asyncToGenerator'] : []
};

if (isTestFilesOnly) {
	options.only = /(test|test\-.+|test\/.+)\.js$/;
}

try {
	var localBabel = resolveFrom('.', 'babel-core/register') || resolveFrom('.', 'babel/register');

	require(localBabel)(options);
} catch (err) {
	require('babel-core/register')(options);
}

var path = process.argv[2];

require(path);
