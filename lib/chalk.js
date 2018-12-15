'use strict';
const Chalk = require('chalk').constructor;

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

	ctx = new Chalk(options);
	return ctx;
};
