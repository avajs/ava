'use strict';

const yargs = require('yargs-parser');

const configuration = {
	'camel-case-expansion': false,
	'dot-notation': false
};

// See https://github.com/sindresorhus/meow/issues/128
function fixCliParams(cliStr) {
	// slice surrounding ' and "
	if (cliStr[0] === cliStr[cliStr.length - 1] && '"\''.includes(cliStr[0])) {
		return cliStr.slice(1, -1);
	}

	return cliStr;
}

function normalizeNodeArguments(confParams = [], cliParams = '') {
	const {_, '--': __, ...params} = {
		...yargs(confParams, {configuration}),
		...yargs(fixCliParams(cliParams), {configuration})
	};

	return params;
}

module.exports = normalizeNodeArguments;
