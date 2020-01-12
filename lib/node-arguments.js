'use strict';
const execa = require('execa');

async function normalizeNodeArguments(fromConf = [], fromArgv = '') {
	let parsedArgv = [];
	if (fromArgv !== '') {
		// Use Node.js itself to parse the arguments. This may lead to arbitrary code execution, but since this is only
		// applied to arguments passed when invoking AVA on the command line this is not considered a vulnerability.
		const {stdout} = await execa.command(`${process.execPath} -pe\\ 'JSON.stringify(process.execArgv)'\\ ${fromArgv.replace(/ /g, '\\ ')}`, {shell: true});
		parsedArgv = JSON.parse(stdout).slice(2);
	}

	return [...process.execArgv, ...fromConf, ...parsedArgv];
}

module.exports = normalizeNodeArguments;
