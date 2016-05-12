'use strict';
var childProcess = require('child_process');
var path = require('path');
var fs = require('fs');
var objectAssign = require('object-assign');
var Promise = require('bluebird');
var debug = require('debug')('ava');
var AvaError = require('./ava-error');
var doSend = require('./send');

var fixNpmLink = fs.realpathSync(__filename) !== __filename;

if (fixNpmLink) {
	// Workaround for breakage caused by https://github.com/nodejs/node/pull/5950
	// Those changes will be reverted in https://github.com/nodejs/node/pull/6537

	// Revert #815 and #827 when the above changes land in Node.js
	console.warn('WARNING: `npm link ava` detected: This breaks NYC coverage on early versions of Node 6.\nSee https://github.com/sindresorhus/ava/pull/815');
}

var env = process.env;

// ensure NODE_PATH paths are absolute
if (env.NODE_PATH) {
	env = objectAssign({}, env);

	env.NODE_PATH = env.NODE_PATH
		.split(path.delimiter)
		.map(function (x) {
			return path.resolve(x);
		})
		.join(path.delimiter);
}

module.exports = function (file, opts) {
	opts = objectAssign({
		file: file,
		baseDir: process.cwd(),
		tty: process.stdout.isTTY ? {
			columns: process.stdout.columns,
			rows: process.stdout.rows
		} : false
	}, opts);

	var ps;

	if (fixNpmLink) {
		// Workaround for breakage caused by https://github.com/nodejs/node/pull/5950
		// Those changes will be reverted in https://github.com/nodejs/node/pull/6537

		// Revert #815 and #827 when the above changes land in Node.js
		var execArgv = process.execArgv;
		var cwd = path.dirname(file);

		// This whole if statement is copied straight out of Nodes `child_process`
		if (process._eval != null) { // eslint-disable-line
			var index = execArgv.lastIndexOf(process._eval);
			if (index > 0) {
				// Remove the -e switch to avoid fork bombing ourselves.
				execArgv = execArgv.slice();
				execArgv.splice(index - 1, 2);
			}
		}

		var testWorkerPath = path.join(__dirname, 'test-worker.js');

		var args = execArgv.concat([
			'-e',
			'require(' + JSON.stringify(testWorkerPath) + ')',
			testWorkerPath,
			JSON.stringify(opts)
		]);

		ps = childProcess.spawn(process.execPath, args, {
			cwd: cwd,
			stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
			env: env
		});
	} else {
		ps = childProcess.fork(path.join(__dirname, 'test-worker.js'), [JSON.stringify(opts)], {
			cwd: path.dirname(file),
			silent: true,
			env: env
		});
	}

	var relFile = path.relative('.', file);

	var exiting = false;
	var send = function (ps, name, data) {
		if (!exiting) {
			// This seems to trigger a Node bug which kills the AVA master process, at
			// least while running AVA's tests. See
			// <https://github.com/novemberborn/_ava-tap-crash> for more details.
			doSend(ps, name, data);
		}
	};

	var testResults = [];
	var results;

	var promise = new Promise(function (resolve, reject) {
		ps.on('error', reject);

		// emit `test` and `stats` events
		ps.on('message', function (event) {
			if (!event.ava) {
				return;
			}

			event.name = event.name.replace(/^ava\-/, '');
			event.data.file = relFile;

			debug('ipc %s:\n%o', event.name, event.data);

			ps.emit(event.name, event.data);
		});

		ps.on('test', function (props) {
			testResults.push(props);
		});

		ps.on('results', function (data) {
			results = data;
			data.tests = testResults;
			send(ps, 'teardown');
		});

		ps.on('exit', function (code, signal) {
			if (code > 0) {
				return reject(new AvaError(relFile + ' exited with a non-zero exit code: ' + code));
			}

			if (code === null && signal) {
				return reject(new AvaError(relFile + ' exited due to ' + signal));
			}

			if (results) {
				resolve(results);
			} else {
				reject(new AvaError('Test results were not received from ' + relFile));
			}
		});

		ps.on('no-tests', function (data) {
			send(ps, 'teardown');

			var message = 'No tests found in ' + relFile;

			if (!data.avaRequired) {
				message += ', make sure to import "ava" at the top of your test file';
			}

			reject(new AvaError(message));
		});
	});

	// teardown finished, now exit
	ps.on('teardown', function () {
		send(ps, 'exit');
		exiting = true;
	});

	// uncaught exception in fork, need to exit
	ps.on('uncaughtException', function () {
		send(ps, 'teardown');
	});

	ps.stdout.on('data', function (data) {
		if (!opts.silent) {
			ps.emit('stdout', data);
		}
	});

	ps.stderr.on('data', function (data) {
		if (!opts.silent) {
			ps.emit('stderr', data);
		}
	});

	promise.on = function () {
		ps.on.apply(ps, arguments);

		return promise;
	};

	promise.send = function (name, data) {
		send(ps, name, data);

		return promise;
	};

	promise.exit = function () {
		send(ps, 'init-exit');

		return promise;
	};

	// send 'run' event only when fork is listening for it
	var isReady = false;

	ps.on('stats', function () {
		isReady = true;
	});

	promise.run = function (options) {
		if (isReady) {
			send(ps, 'run', options);
			return promise;
		}

		ps.on('stats', function () {
			send(ps, 'run', options);
		});

		return promise;
	};

	return promise;
};
