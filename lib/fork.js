'use strict';
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const Emittery = require('./emittery');

if (fs.realpathSync(__filename) !== __filename) {
	console.warn('WARNING: `npm link ava` and the `--preserve-symlink` flag are incompatible. We have detected that AVA is linked via `npm link`, and that you are using either an early version of Node 6, or the `--preserve-symlink` flag. This breaks AVA. You should upgrade to Node 6.2.0+, avoid the `--preserve-symlink` flag, or avoid using `npm link ava`.');
}

const env = Object.assign({NODE_ENV: 'test'}, process.env);

// Ensure NODE_PATH paths are absolute
if (env.NODE_PATH) {
	env.NODE_PATH = env.NODE_PATH
		.split(path.delimiter)
		.map(x => path.resolve(x))
		.join(path.delimiter);
}

// In case the test file imports a different AVA install,
// the presence of this variable allows it to require this one instead
env.AVA_PATH = path.resolve(__dirname, '..');

const describeTTY = tty => ({
	colorDepth: tty.getColorDepth ? tty.getColorDepth() : undefined,
	columns: tty.columns || 80,
	rows: tty.rows
});

const workerPath = require.resolve('./worker/subprocess');

module.exports = (file, opts, execArgv) => {
	let finished = false;

	const emitter = new Emittery();
	const emitStateChange = evt => {
		if (!finished) {
			emitter.emit('stateChange', Object.assign(evt, {testFile: file}));
		}
	};

	opts = Object.assign({
		file,
		baseDir: process.cwd(),
		tty: {
			stderr: process.stderr.isTTY ? describeTTY(process.stderr) : false,
			stdout: process.stdout.isTTY ? describeTTY(process.stdout) : false
		}
	}, opts);

	const args = [opts.color ? '--color' : '--no-color'].concat(opts.workerArgv);

	const subprocess = childProcess.fork(workerPath, args, {
		cwd: opts.projectDir,
		silent: true,
		env,
		execArgv: execArgv || process.execArgv
	});

	subprocess.stdout.on('data', chunk => {
		emitStateChange({type: 'worker-stdout', chunk});
	});

	subprocess.stderr.on('data', chunk => {
		emitStateChange({type: 'worker-stderr', chunk});
	});

	let forcedExit = false;
	const send = evt => {
		if (subprocess.connected && !finished && !forcedExit) {
			subprocess.send({ava: evt});
		}
	};

	const promise = new Promise(resolve => {
		const finish = () => {
			finished = true;
			resolve();
		};

		subprocess.on('message', message => {
			if (!message.ava) {
				return;
			}

			if (message.ava.type === 'ready-for-options') {
				send({type: 'options', options: opts});
				return;
			}

			if (message.ava.type === 'ping') {
				send({type: 'pong'});
			} else {
				emitStateChange(message.ava);
			}
		});

		subprocess.on('error', err => {
			emitStateChange({type: 'worker-failed', err});
			finish();
		});

		subprocess.on('exit', (code, signal) => {
			if (forcedExit) {
				emitStateChange({type: 'worker-finished', forcedExit});
			} else if (code > 0) {
				emitStateChange({type: 'worker-failed', nonZeroExitCode: code});
			} else if (code === null && signal) {
				emitStateChange({type: 'worker-failed', signal});
			} else {
				emitStateChange({type: 'worker-finished', forcedExit});
			}

			finish();
		});
	});

	return {
		exit() {
			forcedExit = true;
			subprocess.kill();
		},

		notifyOfPeerFailure() {
			send({type: 'peer-failed'});
		},

		onStateChange(listener) {
			return emitter.on('stateChange', listener);
		},

		file,
		promise
	};
};
