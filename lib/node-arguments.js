'use strict';

const yargs = require('yargs-parser');

const configuration = {
	'camel-case-expansion': false,
	'dot-notation': false
};

function normalizeNodeArguments(confParams = [], cliParams = '') {
	const {_, '--': __, ...params} = {
		...yargs(confParams, {configuration}),
		...yargs(cliParams, {configuration})
	};

	return params;
}

module.exports = normalizeNodeArguments;
