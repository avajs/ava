'use strict';

var chalk = require('chalk');

module.exports = {
	error: chalk.red,
	skip: chalk.yellow,
	pass: chalk.green,
	duration: chalk.gray.dim,
	stack: chalk.red
};
