'use strict';
var path = require('path');

module.exports = function (file, base, separator) {
	var prefix = file
		.replace(base, function (match, offset) {
			// only replace this.base if it is found at the start of the path
			return offset === 0 ? '' : match;
		})
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test-/g, '')
		.replace(/\.js$/, '')
		.split(path.sep)
		.filter(function (p) {
			return p !== '__tests__';
		})
		.join(separator);

	if (prefix.length > 0) {
		prefix += separator;
	}

	return prefix;
};
