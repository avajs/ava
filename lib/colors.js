'use strict';
const chalk = require('chalk');

module.exports = {
	title: chalk.bold.white,
	error: chalk.red,
	skip: chalk.yellow,
	todo: chalk.blue,
	pass: chalk.green,
	duration: chalk.gray.dim,
	errorSource: chalk.gray,
	errorStack: chalk.gray,
	stack: chalk.red,
	information: chalk.magenta
};
