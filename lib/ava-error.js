'use strict';

function AvaError(message) {
	if (!(this instanceof AvaError)) {
		return new AvaError(message);
	}

	this.message = message;
	this.name = 'AvaError';
}

module.exports = AvaError;
