'use strict';
var StackUtils = require('stack-utils');
var debug = require('debug')('ava');

function indent(str) {
	return '    ' + str;
}

// ignore stack trace lines, which aren't important to the developer
var ignoreStackLines = [];

var avaInternals = /\/ava\/(?:lib\/)?[\w-]+\.js:\d+:\d+\)?$/;
var avaDependencies = /\/node_modules\/(?:bluebird|empower-core|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//;

if (!debug.enabled) {
	ignoreStackLines = StackUtils.nodeInternals();
	ignoreStackLines.push(avaInternals);
	ignoreStackLines.push(avaDependencies);
}

var stackUtils = new StackUtils({internals: ignoreStackLines});

// beautify stack
module.exports = function (stack) {
	if (!stack) {
		return '';
	}

	var title = stack.split('\n')[0];
	var lines = stackUtils
		.clean(stack)
		.split('\n')
		.map(indent)
		.join('\n');

	return title + '\n' + lines;
};
