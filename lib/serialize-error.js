'use strict';
var cleanYamlObject = require('clean-yaml-object');
var beautifyStack = require('./beautify-stack');

function filter(propertyName, isRoot, source, target) {
	if (!isRoot) {
		return true;
	}

	if (propertyName === 'stack') {
		target.stack = beautifyStack(source.stack);
		return false;
	}

	return true;
}

module.exports = function (error) {
	return cleanYamlObject(error, filter);
};
