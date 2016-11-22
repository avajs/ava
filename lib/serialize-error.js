'use strict';
const cleanYamlObject = require('clean-yaml-object');
const beautifyStack = require('./beautify-stack');

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

module.exports = error => cleanYamlObject(error, filter);
