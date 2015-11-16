'use strict';
var destroyCircular = require('destroy-circular');

// Make a value ready for JSON.stringify() / process.send()
module.exports = function serializeValue(value) {
	if (typeof value === 'object') {
		return destroyCircular(value);
	}

	if (typeof value === 'function') {
		// JSON.stringify discards functions, leaving no context information once we serialize and send across.
		// We replace thrown functions with a string to provide as much information to the user as possible.
		return '[Function: ' + (value.name || 'anonymous') + ']';
	}

	return value;
};
