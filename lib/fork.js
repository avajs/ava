'use strict';

var childProcess = require('child_process');
var assign = require('object-assign');
var join = require('path').join;

module.exports = fork;

function fork(file) {
	var babel = join(__dirname, 'babel.js');

	var options = {
		silent: true,
		env: assign({}, process.env, {AVA_FORK: 1})
	};

	return childProcess.fork(babel, [file], options);
}
