'use strict';

var StackUtils = require('stack-utils');
var debug = require('debug')('ava');

var stackUtils = new StackUtils({
	internals: debug.enabled ? [] : StackUtils.nodeInternals().concat([
		/\/ava\/(?:lib\/)?[\w-]+\.js:\d+:\d+\)?$/,
		/\/node_modules\/(?:bluebird|empower-core|(?:ava\/node_modules\/)?(?:babel-runtime|core-js))\//
	])
});

function beautifyStack(stack) {
	return stack.split('\n')[0] + '\n' + stackUtils.clean(stack).split('\n').map(function (s) {
		return '    ' + s;
	}).join('\n');
}

module.exports = beautifyStack;
