'use strict';
module.exports = options => {
	const tty = require('tty');

	const fakeTTYs = new Set();

	const {isatty} = tty;
	tty.isatty = fd => fakeTTYs.has(fd) || isatty(fd);

	const simulateTTY = (stream, {colorDepth, columns, rows}) => {
		Object.assign(stream, {isTTY: true, columns, rows});

		if (colorDepth !== undefined) {
			stream.getColorDepth = () => colorDepth;
		}
	};

	if (options.tty.stderr) {
		simulateTTY(process.stderr, options.tty.stderr);
		fakeTTYs.add(2);
	}

	if (options.tty.stdout) {
		simulateTTY(process.stdout, options.tty.stdout);
		fakeTTYs.add(1);
	}
};
