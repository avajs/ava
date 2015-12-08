'use strict';
var childProcess = require('child_process');
var Promise = require('../node_modules/bluebird');
var path = require('../node_modules/path');
var send = require('./send');

module.exports = function (args) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	var filepath = path.join(__dirname, 'babel.js');
	var file = args[0];

	var options = {
		silent: true,
		cwd: path.dirname(file)
	};

	var ps = childProcess.fork(filepath, args, options);

	var promise = new Promise(function (resolve, reject) {
		var testResults;

		ps.on('error', reject);
		ps.on('results', function (results) {
			testResults = results;

			send(ps, 'teardown');
		});

		ps.on('exit', function (code) {
			if (code > 0 && code !== 143) {
				return reject(new Error(file + ' exited with a non-zero exit code: ' + code));
			}

			if (testResults) {
				if (testResults.tests.length === 0) {
					testResults.stats.failCount = 1;
					testResults.tests.push({
						duration: 0,
						title: file,
						error: new Error('No tests for ' + file),
						type: 'test'
					});
				}

				resolve(testResults);
			} else {
				reject(new Error('Test results were not received from: ' + file));
			}
		});
	});

	// emit `test` and `stats` events
	ps.on('message', function (event) {
		if (!event.ava) {
			return;
		}

		event.name = event.name.replace(/^ava\-/, '');
		event.data.file = file;

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

	// emit data events on forked process' output
	ps.stdout.on('data', function (data) {
		ps.emit('data', data);
	});

	ps.stderr.on('data', function (data) {
		ps.emit('data', data);
	});

	promise.on = function () {
		ps.on.apply(ps, arguments);

		return promise;
	};

	return promise;
};
