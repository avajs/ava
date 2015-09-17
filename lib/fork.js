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

	var promise = new Promise(function (resolve) {
		ps.on('exit', resolve);
	});

	// emit data events on forked process' output
	ps.stdout.on('data', function (data) {
		ps.emit('data', data);
	});

	ps.stderr.on('data', function (data) {
		ps.emit('data', data);
	});

	promise.on = function (event) {
		ps.on.apply(ps, arguments);

		return promise;
	};

	return promise;
}
