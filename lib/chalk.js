'use strict';
const chalk = require('chalk');

let ctx = null;
exports.get = () => {
	if (!ctx) {
		throw new Error('Chalk has not yet been configured');
	}

	return ctx;
};

exports.set = options => {
	if (ctx) {
		throw new Error('Chalk has already been configured');
	}

	ctx = new chalk.Instance(options);
	return ctx;
};
