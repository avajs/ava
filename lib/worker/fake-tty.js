'use strict';
const tty = require('tty');
const ansiEscapes = require('ansi-escapes');
const options = require('./options').get();
const makeHasColors = require('./fake-tty-has-colors');

const fakeTTYs = new Set();

const {isatty} = tty;
tty.isatty = fd => fakeTTYs.has(fd) || isatty(fd);

const takesCallbackAndReturnWriteResult = tty.WriteStream.prototype.clearLine.length === 1;

const assertCallback = callback => {
	// FIXME: Better replicate Node.js' internal errors.
	if (callback !== undefined && typeof callback !== 'function') {
		const error = new TypeError('Callback must be a function');
		error.code = 'ERR_INVALID_CALLBACK';
		throw error;
	}
};

const fakeWriters = {
	clearLine(dir, callback) {
		assertCallback(callback);

		switch (dir) {
			case -1:
				return this.write(ansiEscapes.eraseStartLine, callback);
			case 1:
				return this.write(ansiEscapes.eraseEndLine, callback);
			default:
				return this.write(ansiEscapes.eraseLine, callback);
		}
	},

	clearScreenDown(callback) {
		assertCallback(callback);

		return this.write(ansiEscapes.eraseDown, callback);
	},

	cursorTo(x, y, callback) {
		assertCallback(callback);
		return this.write(ansiEscapes.cursorTo(x, y), callback);
	},

	moveCursor(x, y, callback) {
		assertCallback(callback);
		return this.write(ansiEscapes.cursorMove(x, y), callback);
	}
};

const simulateTTY = (stream, {colorDepth, hasColors, columns, rows}) => {
	Object.assign(stream, {isTTY: true, columns, rows});

	if (takesCallbackAndReturnWriteResult) {
		Object.assign(stream, fakeWriters);
	} else {
		Object.assign(stream, {
			clearLine(dir) {
				fakeWriters.clearLine.call(this, dir);
			},
			clearScreenDown() {
				fakeWriters.clearScreenDown.call(this);
			},
			cursorTo(x, y) {
				fakeWriters.cursorTo.call(this, x, y);
			},
			moveCursor(x, y) {
				fakeWriters.moveCursor.call(this, x, y);
			}
		});
	}

	stream.getWindowSize = () => [80, 24];
	if (colorDepth !== undefined) {
		stream.getColorDepth = () => colorDepth;
	}

	if (hasColors) {
		stream.hasColors = makeHasColors(colorDepth);
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
