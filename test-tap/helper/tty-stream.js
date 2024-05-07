import stream from 'node:stream';

import ansiEscapes from 'ansi-escapes';
import {stringToUint8Array, concatUint8Arrays, uint8ArrayToString} from 'uint8array-extras';

export default class TTYStream extends stream.Writable {
	constructor(options) {
		super();

		this.isTTY = true;
		this.columns = options.columns;

		this.sanitizers = options.sanitizers ?? [];
		this.chunks = [];
		this.spinnerActivity = [];
	}

	_write(chunk, encoding, callback) {
		if (this.spinnerActivity.length > 0) {
			this.chunks.push(concatUint8Arrays(this.spinnerActivity), TTYStream.SEPARATOR);
			this.spinnerActivity = [];
		}

		const string = this.sanitizers.reduce((string_, sanitizer) => sanitizer(string_), chunk.toString('utf8')); // eslint-disable-line unicorn/no-array-reduce
		// Ignore the chunk if it was scrubbed completely. Still count 0-length
		// chunks.
		if (string !== '' || chunk.length === 0) {
			this.chunks.push(
				stringToUint8Array(string),
				TTYStream.SEPARATOR,
			);
		}

		callback();
	}

	_writev(chunks, callback) {
		if (this.spinnerActivity.length > 0) {
			this.chunks.push(concatUint8Arrays(this.spinnerActivity), TTYStream.SEPARATOR);
			this.spinnerActivity = [];
		}

		for (const object of chunks) {
			this.chunks.push(stringToUint8Array(this.sanitizers.reduce((string, sanitizer) => sanitizer(string), uint8ArrayToString(object.chunk)))); // eslint-disable-line unicorn/no-array-reduce
		}

		this.chunks.push(TTYStream.SEPARATOR);
		callback();
	}

	asUint8Array() {
		return concatUint8Arrays(this.chunks);
	}

	toString() {
		return uint8ArrayToString(array);
	}

	clearLine() {
		this.spinnerActivity.push(stringToUint8Array(ansiEscapes.eraseLine));
	}

	cursorTo(x, y) {
		this.spinnerActivity.push(stringToUint8Array(ansiEscapes.cursorTo(x, y)));
	}

	moveCursor(dx, dy) {
		this.spinnerActivity.push(stringToUint8Array(ansiEscapes.cursorMove(dx, dy)));
	}
}

TTYStream.SEPARATOR = stringToUint8Array('---tty-stream-chunk-separator\n');
