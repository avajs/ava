import childProcess from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

import getStream from 'get-stream';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const cliPath = fileURLToPath(new URL('../../entrypoints/cli.mjs', import.meta.url));

export function execCli(args, options, cb) {
	let dirname;
	let env;

	if (typeof options === 'function') {
		cb = options;
		dirname = path.resolve(__dirname, '..', 'fixture');
		env = {};
	} else {
		dirname = path.resolve(__dirname, '..', options.dirname ? options.dirname : 'fixture');
		env = options.env || {};
	}

	let child;
	let stdout;
	let stderr;

	const processPromise = new Promise(resolve => {
		child = childProcess.spawn(process.execPath, [cliPath].concat(args), { // eslint-disable-line unicorn/prefer-spread
			cwd: dirname,
			env: {AVA_FORCE_CI: 'ci', ...env}, // Force CI to ensure the correct reporter is selected
			// env,
			stdio: [null, 'pipe', 'pipe']
		});

		child.on('close', (code, signal) => {
			if (code) {
				const err = new Error(`test-worker exited with a non-zero exit code: ${code}`);
				err.code = code;
				err.signal = signal;
				resolve(err);
				return;
			}

			resolve(code);
		});

		stdout = getStream(child.stdout);
		stderr = getStream(child.stderr);
	});

	Promise.all([processPromise, stdout, stderr]).then(args => {
		cb(...args);
	});

	return child;
}
