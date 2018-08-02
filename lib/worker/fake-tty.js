'use strict';
const tty = require('tty');
const options = require('./options').get();

if (options.tty) {
	Object.assign(process.stdout, {isTTY: true}, options.tty);

	if (options.tty.colorDepth !== undefined) {
		process.stdout.getColorDepth = () => options.tty.colorDepth;
	}

	const isatty = tty.isatty;
	tty.isatty = function (fd) {
		if (fd === 1 || fd === process.stdout) {
			return true;
		}

		return isatty(fd);
	};
}
