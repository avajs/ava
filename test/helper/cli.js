'use strict';
const path = require('path');
const childProcess = require('child_process');
const getStream = require('get-stream');

const cliPath = path.join(__dirname, '../../cli.js');
const ttySimulator = path.join(__dirname, 'simulate-tty.js');

function execCli(args, opts, cb) {
	let dirname;
	let env;

	if (typeof opts === 'function') {
		cb = opts;
		dirname = path.resolve(__dirname, '..', 'fixture');
		env = {};
	} else {
		dirname = path.resolve(__dirname, '..', opts.dirname ? opts.dirname : 'fixture');
		env = opts.env || {};
	}

	let child;
	let stdout;
	let stderr;

	const processPromise = new Promise(resolve => {
		// Spawning a child with piped IO means that the CLI will never see a TTY.
		// Inserting a shim here allows us to fake a TTY.
		child = childProcess.spawn(process.execPath, ['-r', ttySimulator, cliPath].concat(args), {
			cwd: dirname,
			env: Object.assign({CI: '1'}, env), // Force CI to ensure the correct reporter is selected
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
		cb.apply(null, args);
	});

	return child;
}
exports.execCli = execCli;
