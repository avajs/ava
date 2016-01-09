'use strict';
var childProcess = require('child_process');
var path = require('path');
var objectAssign = require('object-assign');
var Promise = require('bluebird');
var debug = require('debug')('ava');
var AvaError = require('./ava-error');
var send = require('./send');

module.exports = function (file, opts) {
	opts = objectAssign({
		file: file,
		tty: process.stdout.isTTY ? {
			columns: process.stdout.columns,
			rows: process.stdout.rows
		} : false
	}, opts);

	var ps = childProcess.fork(path.join(__dirname, 'test-worker.js'), [JSON.stringify(opts)], {
		cwd: path.dirname(file),
		silent: true
	});

	var relFile = path.relative('.', file);

	var promise = new Promise(function (resolve, reject) {
		var testResults;

		ps.on('error', reject);

		ps.on('results', function (results) {
			testResults = results;

			send(ps, 'teardown');
		});

		ps.on('exit', function (code) {
			if (code > 0 && code !== 143) {
				return reject(new AvaError(relFile + ' exited with a non-zero exit code: ' + code));
			}

			if (testResults) {
				resolve(testResults);
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

	// teardown finished, now exit
	ps.on('teardown', function () {
		send(ps, 'exit');
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

	// send 'run' event only when fork is listening for it
	var isReady = false;

	ps.on('stats', function () {
		isReady = true;
	});

	promise.run = function () {
		if (isReady) {
			send(ps, 'run');
			return promise;
		}

		ps.on('stats', function () {
			send(ps, 'run');
		});

		return promise;
	};

	return promise;
};
