'use strict';

var resolveFrom = require('resolve-from');

try {
	require(resolveFrom('.', 'babel-core/register') || resolveFrom('.', 'babel/register'));
} catch (err) {
	require('babel-core/register');
}

var path = process.argv[2];

require(path);
