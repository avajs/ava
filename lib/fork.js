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

	promise.on = function () {
		ps.on.apply(ps, arguments);

		return promise;
	};

	return promise;
}
