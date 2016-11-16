'use strict';
var StackUtils = require('stack-utils');
var debug = require('debug')('ava');

//-----------
// embedded `clean-stack` module (because it requires Node.js 4)
var extractPathRegex = /\s+at.*(?:\(|\s)(.*)\)?/;
var pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/babel-polyfill\/.*)?\w+)\.js:\d+:\d+)|native)/;

var cleanStack = function (stack) {
	return stack.replace(/\\/g, '/').split('\n').filter(function (x) {
		var pathMatches = x.match(extractPathRegex);
		if (pathMatches === null || !pathMatches[1]) {
			return true;
		}

		return !pathRegex.test(pathMatches[1]);
	}).filter(function (x) {
		return x.trim() !== '';
	}).join('\n');
};
//-----------

function indent(str) {
	return '    ' + str;
}

// ignore unimportant stack trace lines
var ignoreStackLines = [];

var avaInternals = /\/ava\/(?:lib\/)?[\w-]+\.js:\d+:\d+\)?$/;
var avaDependencies = /\/node_modules\/(?:bluebird|empower-core|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//;

if (!debug.enabled) {
	ignoreStackLines = StackUtils.nodeInternals();
	ignoreStackLines.push(avaInternals);
	ignoreStackLines.push(avaDependencies);
}

var stackUtils = new StackUtils({internals: ignoreStackLines});

module.exports = function (stack) {
	if (!stack) {
		return '';
	}

	// workaround for https://github.com/tapjs/stack-utils/issues/14
	// TODO: fix it in `stack-utils`
	stack = cleanStack(stack);

	var title = stack.split('\n')[0];
	var lines = stackUtils
		.clean(stack)
		.split('\n')
		.map(indent)
		.join('\n');

	return title + '\n' + lines;
};
