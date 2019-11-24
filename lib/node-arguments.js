'use strict';

const minimist = require('minimist');
const omit = require('lodash/omit');

/**
 * @param {string[]} confParams
 * @param {string} cliParams
 * @return {object}
 */
function normalizeNodeArguments(confParams, cliParams) {
	return omit({
		...minimist(confParams || []),
		...minimist(cliParams.split(' '))
	}, '_');
}

module.exports = normalizeNodeArguments;
