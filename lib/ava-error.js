'use strict';

class AvaError extends Error {
	constructor(message) {
		super(message);
		this.name = 'AvaError';
		this.message = message;
	}
}

module.exports = AvaError;
