'use strict';

var wrapListener = require('babel-plugin-detective/wrap-listener');

module.exports = wrapListener(rewriteBabelRuntimePaths, 'rewrite-runtime', {
	generated: true,
	require: true,
	import: true
});

function rewriteBabelRuntimePaths(path) {
	var isBabelPath = /^babel-runtime[\\\/]?/.test(path.node.value);

	if (path.isLiteral() && isBabelPath) {
		path.node.value = require.resolve(path.node.value);
	}
}
