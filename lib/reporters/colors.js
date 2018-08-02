'use strict';
const chalk = require('../chalk').get();

module.exports = {
	log: chalk.gray,
	title: chalk.bold,
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
