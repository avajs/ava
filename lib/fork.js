'use strict';

var childProcess = require('child_process');
var Promise = require('bluebird');
var assign = require('object-assign');
var join = require('path').join;

module.exports = fork;

function fork(file) {
	var babel = join(__dirname, 'babel.js');

	var options = {
		silent: true,
		env: assign({}, process.env, {AVA_FORK: 1})
	};

	var ps = childProcess.fork(babel, [file], options);

	var promise = new Promise(function (resolve, reject) {
		ps.on('results', function (results) {
			resolve(results);
		});

		// reject only when forked process failed
		ps.on('exit', function (code) {
			if (code > 0) {
				reject();
			}
		});
	});

	// emit `test` and `stats` events
	ps.on('message', function (event) {
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
}
