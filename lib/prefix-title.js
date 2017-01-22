'use strict';
const path = require('path');

module.exports = (file, base, separator) => {
	let prefix = file
		// Only replace this.base if it is found at the start of the path
		.replace(base, (match, offset) => offset === 0 ? '' : match)
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test-/g, '')
		.replace(/\.js$/, '')
		.split(path.sep)
		.filter(p => p !== '__tests__')
		.join(separator);

	if (prefix.length > 0) {
		prefix += separator;
	}

	return prefix;
};
