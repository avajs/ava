import childProcess from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
		dirname = path.resolve(__dirname, '..', options.dirname || 'fixture');
		env = options.env || {};
	}

	let child;
	let stdout;
	let stderr;

	const processPromise = new Promise(resolve => {
		child = childProcess.spawn(process.execPath, [cliPath].concat(args), { // eslint-disable-line unicorn/prefer-spread
			cwd: dirname,
			env: {
				AVA_FORCE_CI: 'ci', // Force CI to ensure the correct reporter is selected
				AVA_FAKE_SCM_ROOT: '.fake-root', // This is an internal test flag.
				...env,
			},
			// Env,
			stdio: [null, 'pipe', 'pipe'],
		});

		child.on('close', (code, signal) => {
			if (code) {
				const error = new Error(`test-worker exited with a non-zero exit code: ${code}`);
				error.code = code;
				error.signal = signal;
				resolve(error);
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
