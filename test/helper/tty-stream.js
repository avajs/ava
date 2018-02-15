'use strict';
const stream = require('stream');

class TTYStream extends stream.Writable {
	constructor(options) {
		super();

		this.isTTY = true;
		this.columns = options.columns;

		this.sanitizers = options.sanitizers || [];
		this.chunks = [];
	}

	_write(chunk, encoding, callback) {
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

	asBuffer() {
		return Buffer.concat(this.chunks);
	}
}

TTYStream.SEPARATOR = Buffer.from('---tty-stream-chunk-separator\n', 'utf8');

module.exports = TTYStream;
