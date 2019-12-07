'use strict';

const yargs = require('yargs-parser');

function normalizeNodeArguments(confParams = [], cliParams = '') {
	const {_, ...params} = {
		...yargs(confParams || []),
		...yargs(cliParams)
	}

	return params;
}

module.exports = normalizeNodeArguments;
