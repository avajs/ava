'use strict';
const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');
const debug = require('debug')('ava');
const AvaError = require('./ava-error');

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

module.exports = (file, opts, execArgv) => {
	opts = Object.assign({
		file,
		baseDir: process.cwd(),
		tty: process.stdout.isTTY ? {
			columns: process.stdout.columns,
			rows: process.stdout.rows
		} : false
	}, opts);

	const args = [JSON.stringify(opts), opts.color ? '--color' : '--no-color'];

	const ps = childProcess.fork(path.join(__dirname, 'test-worker.js'), args, {
		cwd: opts.projectDir,
		silent: true,
		env,
		execArgv: execArgv || process.execArgv
	});

	const relFile = path.relative('.', file);

	let exiting = false;
	const send = (name, data) => {
		if (!exiting) {
			// This seems to trigger a Node bug which kills the AVA master process, at
			// least while running AVA's tests. See
			// <https://github.com/novemberborn/_ava-tap-crash> for more details.
			ps.send({
				name: `ava-${name}`,
				data,
				ava: true
			});
		}
	};

	const testResults = [];
	let results;

	const promise = new Promise((resolve, reject) => {
		ps.on('error', reject);

		// Emit `test` and `stats` events
		ps.on('message', event => {
			if (!event.ava) {
				return;
			}

			event.name = event.name.replace(/^ava-/, '');
			event.data.file = relFile;

			debug('ipc %s:\n%o', event.name, event.data);

			ps.emit(event.name, event.data);
		});

		ps.on('test', props => {
			testResults.push(props);
		});

		ps.on('results', data => {
			results = data;
			data.tests = testResults;
			send('teardown');
		});

		ps.on('exit', (code, signal) => {
			if (code > 0) {
				return reject(new AvaError(`${relFile} exited with a non-zero exit code: ${code}`));
			}

			if (code === null && signal) {
				return reject(new AvaError(`${relFile} exited due to ${signal}`));
			}

			if (results) {
				resolve(results);
			} else {
				reject(new AvaError(`Test results were not received from ${relFile}`));
			}
		});

		ps.on('no-tests', data => {
			send('teardown');

			let message = `No tests found in ${relFile}`;

			if (!data.avaRequired) {
				message += ', make sure to import "ava" at the top of your test file';
			}

			reject(new AvaError(message));
		});
	});

	// Teardown finished, now exit
	ps.on('teardown', () => {
		send('exit');
		exiting = true;
	});

	// Uncaught exception in fork, need to exit
	ps.on('uncaughtException', () => {
		send('teardown');
	});

	ps.stdout.on('data', data => {
		ps.emit('stdout', data);
	});

	ps.stderr.on('data', data => {
		ps.emit('stderr', data);
	});

	promise.on = function () {
		ps.on.apply(ps, arguments);
		return promise;
	};

	promise.send = (name, data) => {
		send(name, data);
		return promise;
	};

	promise.exit = () => {
		send('init-exit');
		return promise;
	};

	// Send 'run' event only when fork is listening for it
	let isReady = false;

	ps.on('stats', () => {
		isReady = true;
	});

	promise.run = options => {
		if (isReady) {
			send('run', options);
			return promise;
		}

		ps.on('stats', () => {
			send('run', options);
		});

		return promise;
	};

	return promise;
};
