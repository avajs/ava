'use strict';
const arrgv = require('arrgv');

function normalizeNodeArguments(fromConf = [], fromArgv = '') {
	let parsedArgv = [];
	if (fromArgv !== '') {
		try {
			parsedArgv = arrgv(fromArgv);
		} catch {
			throw new Error('Could not parse `--node-arguments` value. Make sure all strings are closed and backslashes are used correctly.');
		}
	}

	return [...process.execArgv, ...fromConf, ...parsedArgv];
}

module.exports = normalizeNodeArguments;
