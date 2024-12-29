import process from 'node:process';

import {tokenizeArgs} from 'args-tokenizer';

export default function normalizeNodeArguments(fromConf = [], fromArgv = '') {
	let parsedArgv = [];
	if (fromArgv !== '') {
		parsedArgv = tokenizeArgs(fromArgv);
	}

	return [...process.execArgv, ...fromConf, ...parsedArgv];
}
