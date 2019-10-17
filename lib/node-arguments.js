'use strict';

const trim = require('lodash/trim');

// Parse formats:
// --param=--parameter --abc
//         |_this____|
// --param=" --arg1 --arg2 param " --abc
//         |_this part___________|
function parseCliParameter(str) {
	str = str[0].startsWith('"') && str.endsWith('"') ? str.slice(1, str.length - 1) : str;
	return trim(str)
		.split(' ');
}

function normalizeNodeArguments(nodeArguments) {
	const parsed = Array.isArray(nodeArguments) ? nodeArguments : parseCliParameter(nodeArguments);

	const detectedInspect = parsed.find(arg => /^--inspect(-brk)?(=|$)/.test(arg));

	if (detectedInspect && detectedInspect.includes('=')) {
		throw new Error('The \'nodeArguments\' configuration must not contain inspect with port.');
	}

	const mainProcessArgs = process.execArgv.filter(arg => !detectedInspect || !/^--inspect(-brk)?(=|$)/.test(arg));

	return parsed.concat(mainProcessArgs);
}

module.exports = normalizeNodeArguments;
