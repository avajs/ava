import process from 'node:process';

import arrgv from 'arrgv';

// TODO: Remove the `explicitlyForwardNodeArguments` option in the next major release, and never prepend `process.execArgv`.
export default function normalizeNodeArguments(fromConf = [], fromArgv = '', shouldForwardProcessExecArgv = true) {
	let parsedArgv = [];
	if (fromArgv !== '') {
		try {
			parsedArgv = arrgv(fromArgv);
		} catch {
			throw new Error('Could not parse `--node-arguments` value. Make sure all strings are closed and backslashes are used correctly.');
		}
	}

	return [...(shouldForwardProcessExecArgv ? process.execArgv : []), ...fromConf, ...parsedArgv];
}
