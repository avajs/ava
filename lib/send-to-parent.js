'use strict';
var path = require('path');
var chalk = require('chalk');
var wrapSend = require('./wrap-send');

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var fp = path.relative('.', process.argv[1]);

	console.log();
	console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

	process.exit(1); // eslint-disable-line
}

module.exports = wrapSend(function (data) {
	process.send(data);
});
