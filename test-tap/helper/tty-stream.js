import {Buffer} from 'node:buffer';
import stream from 'node:stream';

import ansiEscapes from 'ansi-escapes';

export default class TTYStream extends stream.Writable {
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

		const string = this.sanitizers.reduce((string_, sanitizer) => sanitizer(string_), chunk.toString('utf8')); // eslint-disable-line unicorn/no-array-reduce
		// Ignore the chunk if it was scrubbed completely. Still count 0-length
		// chunks.
		if (string !== '' || chunk.length === 0) {
			this.chunks.push(
				Buffer.from(string, 'utf8'),
				TTYStream.SEPARATOR,
			);
		}

		callback();
	}

	_writev(chunks, callback) {
		if (this.spinnerActivity.length > 0) {
			this.chunks.push(Buffer.concat(this.spinnerActivity), TTYStream.SEPARATOR);
			this.spinnerActivity = [];
		}

		for (const object of chunks) {
			this.chunks.push(Buffer.from(this.sanitizers.reduce((string, sanitizer) => sanitizer(string), object.chunk.toString('utf8')), 'utf8')); // eslint-disable-line unicorn/no-array-reduce
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
