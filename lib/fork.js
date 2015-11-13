'use strict';
var childProcess = require('child_process');
var Promise = require('bluebird');
var path = require('path');

module.exports = function (args) {
	if (!Array.isArray(args)) {
		args = [args];
	}

	var babel = path.join(__dirname, 'babel.js');
	var file = args[0];

	var options = {
		silent: true,
		cwd: path.dirname(file)
	};

	var start = Date.now();
	var ps = childProcess.fork(babel, args, options);

	function send(command, data) {
		ps.send({'ava-child-process-command': command, 'data': data});
	}

	var promise = new Promise(function (resolve, reject) {
		var testResults;

		ps.on('results', function (results) {
			testResults = results;

			// after all tests are finished and results received
			// kill the forked process, so AVA can exit safely
			send('cleanup', true);
		});

		ps.on('cleaned-up', function () {
			send('kill', true);
		});

		ps.on('error', reject);

		ps.on('exit', function (code) {
			if (code > 0 && code !== 143) {
				reject(new Error(file + ' exited with a non-zero exit code: ' + code));
			} else if (testResults) {
				if (!testResults.tests.length) {
					testResults.stats.failCount++;
					testResults.tests.push({
						duration: 0,
						title: file,
						error: new Error('No tests for ' + file),
						type: 'test'
					});
				}
				resolve(testResults);
			} else {
				reject(new Error('Never got test results from: ' + file));
			}
		});
	});

	// emit `test` and `stats` events
	ps.on('message', function (event) {
		event.data.file = file;

		ps.emit(event.name, event.data);
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
