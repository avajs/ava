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

	var ps = childProcess.fork(babel, args, options);
	var isTestFile = false;

	var promise = new Promise(function (resolve, reject) {
		var testResults;

		ps.on('results', function (results) {
			testResults = results;

			// after all tests are finished and results received
			// kill the forked process, so AVA can exit safely
			ps.send({'ava-kill-command': true});
		});

		ps.on('error', reject);

		// if babel ended but ava was not imported, we can safely exit
		ps.on('babel-ended', function () {
			if (!isTestFile) {
				ps.send({'ava-kill-command': true});
			}
		});

		ps.on('exit', function (code) {
			if (code > 0 && code !== 143) {
				reject(new Error(file + ' exited with a non-zero exit code: ' + code));
			} else {
				resolve(testResults);
			}
		});
	});

	// emit 'started', `test` and `stats` events
	ps.on('message', function (event) {
		event.data.file = file;

		ps.emit(event.name, event.data);
	});

	// when ava is imported this event is emitted runs  so we know it is a test file
	ps.on('started', function () {
		isTestFile = true;
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
