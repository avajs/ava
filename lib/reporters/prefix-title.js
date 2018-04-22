'use strict';
const path = require('path');
const figures = require('figures');
const chalk = require('../chalk').get();

const SEPERATOR = ' ' + chalk.gray.dim(figures.pointerSmall) + ' ';

module.exports = (base, file, title) => {
	const prefix = file
		// Only replace base if it is found at the start of the path
		.replace(base, (match, offset) => offset === 0 ? '' : match)
		.replace(/\.spec/, '')
		.replace(/\.test/, '')
		.replace(/test-/g, '')
		.replace(/\.js$/, '')
		.split(path.sep)
		.filter(p => p !== '__tests__')
		.join(SEPERATOR);

	return prefix + SEPERATOR + title;
};
