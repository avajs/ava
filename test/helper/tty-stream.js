'use strict';
const stream = require('stream');
const ansiEscapes = require('ansi-escapes');

class TTYStream extends stream.Writable {
	constructor(options) {
		super();

		this.isTTY = true;
		this.columns = options.columns;

		this.sanitizers = options.sanitizers || [];
		this.chunks = [];
		this.spinnerActivity = [];
	}

	_write(chunk, encoding, callback) {
		if (this.spinnerActivity.length > 0) {
			this.chunks.push(Buffer.concat(this.spinnerActivity), TTYStream.SEPARATOR);
			this.spinnerActivity = [];
		}

		const str = this.sanitizers.reduce((str, sanitizer) => sanitizer(str), chunk.toString('utf8'));
		// Ignore the chunk if it was scrubbed completely. Still count 0-length
		// chunks.
		if (str !== '' || chunk.length === 0) {
			this.chunks.push(
				Buffer.from(str, 'utf8'),
				TTYStream.SEPARATOR
			);
		}
		callback();
	}

	_writev(chunks, callback) {
		if (this.spinnerActivity.length > 0) {
			this.chunks.push(Buffer.concat(this.spinnerActivity), TTYStream.SEPARATOR);
			this.spinnerActivity = [];
		}
		for (const obj of chunks) {
			this.chunks.push(Buffer.from(this.sanitizers.reduce((str, sanitizer) => sanitizer(str), obj.chunk.toString('utf8')), 'utf8'));
		}
		this.chunks.push(TTYStream.SEPARATOR);
		callback();
	}

	asBuffer() {
		return Buffer.concat(this.chunks);
	}

	clearLine() {
		this.spinnerActivity.push(Buffer.from(ansiEscapes.eraseLine, 'ascii'));
	}

	cursorTo(x, y) {
		this.spinnerActivity.push(Buffer.from(ansiEscapes.cursorTo(x, y), 'ascii'));
	}

	moveCursor(dx, dy) {
		this.spinnerActivity.push(Buffer.from(ansiEscapes.cursorMove(dx, dy), 'ascii'));
	}
}

TTYStream.SEPARATOR = Buffer.from('---tty-stream-chunk-separator\n', 'utf8');

module.exports = TTYStream;
