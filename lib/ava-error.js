'use strict';

function AvaError(message) {
	if (!(this instanceof AvaError)) {
		throw new TypeError('Class constructor AvaError cannot be invoked without \'new\'');
	}

	this.message = message;
	this.name = 'AvaError';
}

AvaError.prototype = Object.create(Error.prototype);

module.exports = AvaError;
