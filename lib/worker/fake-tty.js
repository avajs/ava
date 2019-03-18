'use strict';
const tty = require('tty');
const ansiEscapes = require('ansi-escapes');
const options = require('./options').get();

const fakeTTYs = new Set();

const {isatty} = tty;
tty.isatty = fd => fakeTTYs.has(fd) || isatty(fd);

const simulateTTY = (stream, {colorDepth, columns, rows}) => {
	Object.assign(stream, {isTTY: true, columns, rows});

	stream.clearLine = dir => {
		switch (dir) {
			case -1:
				stream.write(ansiEscapes.eraseStartLine);
				break;
			case 1:
				stream.write(ansiEscapes.eraseEndLine);
				break;
			default:
				stream.write(ansiEscapes.eraseLine);
		}
	};

	stream.clearScreenDown = () => stream.write(ansiEscapes.eraseDown);

	stream.cursorTo = (x, y) => stream.write(ansiEscapes.cursorTo(x, y));

	stream.getWindowSize = () => [80, 24];

	stream.moveCursor = (x, y) => stream.write(ansiEscapes.cursorMove(x, y));

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
