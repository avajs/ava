'use strict';

var resolveFrom = require('resolve-from');

var options = {
	only: /(test|test\-.+|test\/.+)\.js$/,
	blacklist: ['regenerator'],
	optional: ['asyncToGenerator']
};

try {
	var localBabel = resolveFrom('.', 'babel-core/register') || resolveFrom('.', 'babel/register');

	require(localBabel)(options);
} catch (err) {
	require('babel-core/register')(options);
}

var path = process.argv[2];

require(path);
