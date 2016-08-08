'use strict';
var chalk = require('chalk');

module.exports = {
	title: chalk.white,
	error: chalk.red,
	skip: chalk.yellow,
	todo: chalk.blue,
	pass: chalk.green,
	duration: chalk.gray.dim,
	errorStack: chalk.gray,
	stack: chalk.red
};
