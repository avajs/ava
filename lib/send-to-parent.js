'use strict';
var path = require('path');
var chalk = require('chalk');

// check if the test is being run without AVA cli
var isForked = typeof process.send === 'function';

if (!isForked) {
	var fp = path.relative('.', process.argv[1]);

	console.log();
	console.error('Test files must be run with the AVA CLI:\n\n    ' + chalk.grey.dim('$') + ' ' + chalk.cyan('ava ' + fp) + '\n');

	process.exit(1); // eslint-disable-line xo/no-process-exit
}

module.exports = function (name, data) {
	process.send({
		name: 'ava-' + name,
		data: data,
		ava: true
	});
};
