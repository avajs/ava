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

class Fork {
	constructor(file, opts, execArgv) {
		this.file = file;
		this.finished = false;
		this.forcedExit = false;
		this.emitter = new Emittery();
		this.promise = new Promise(resolve => {
			this._resolve = resolve;
		});

		opts = Object.assign({
			file,
			baseDir: process.cwd(),
			tty: {
				stderr: process.stderr.isTTY ? describeTTY(process.stderr) : false,
				stdout: process.stdout.isTTY ? describeTTY(process.stdout) : false
			}
		}, opts);

		const args = [JSON.stringify(opts), opts.color ? '--color' : '--no-color'].concat(opts.workerArgv);

		const subprocess = childProcess.fork(workerPath, args, {
			cwd: opts.projectDir,
			silent: true,
			env,
			execArgv: execArgv || process.execArgv
		});
		this.subprocess = subprocess;

		subprocess.stdout.on('data', chunk => {
			this.emitStateChange({type: 'worker-stdout', chunk});
		});

		subprocess.stderr.on('data', chunk => {
			this.emitStateChange({type: 'worker-stderr', chunk});
		});

		subprocess.on('message', message => {
			if (!message.ava) {
				return;
			}

			const {type} = message.ava;
			if (type === 'ping') {
				this.send({type: 'pong'});
			} else if (type === 'waiting-file') {
				this._resolve();
			} else if (type === 'reached-exit') {
				this.handleExit(message.ava.code);
			} else {
				this.emitStateChange(message.ava);
			}
		});

		subprocess.on('error', err => {
			this.emitStateChange({type: 'worker-failed', err});
			this.finish();
		});

		subprocess.on('exit', (code, signal) => this.handleExit(code, signal));
	}

	handleExit(code, signal) {
		if (this.forcedExit) {
			this.emitStateChange({type: 'worker-finished', forcedExit: this.forcedExit});
		} else if (code > 0) {
			this.emitStateChange({type: 'worker-failed', nonZeroExitCode: code});
		} else if (code === null && signal) {
			this.emitStateChange({type: 'worker-failed', signal});
		} else {
			this.emitStateChange({type: 'worker-finished', forcedExit: this.forcedExit});
		}

		this.finish();
	}

	finish() {
		this.finished = true;
		this._resolve();
	}

	send(evt) {
		if (this.subprocess.connected && !this.finished && !this.forcedExit) {
			this.subprocess.send({ava: evt});
		}
	}

	emitStateChange(evt) {
		if (!this.finished) {
			this.emitter.emit('stateChange', Object.assign(evt, {testFile: this.file}));
		}
	}

	exit() {
		this.forcedExit = true;
		this.subprocess.kill();
	}

	notifyOfPeerFailure() {
		this.send({type: 'peer-failed'});
	}

	onStateChange(listener) {
		return this.emitter.on('stateChange', listener);
	}

	offStateChange(listener) {
		return this.emitter.off('stateChange', listener);
	}

	newFile(file) {
		this.finished = false;
		this.promise = new Promise(resolve => {
			this._resolve = resolve;
		});
		this.file = file;
		this.send({type: 'new-file', file});
	}
}

module.exports = Fork;
