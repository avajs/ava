'use strict';
var destroyCircular = require('destroy-circular');

// Make a value ready for JSON.stringify() / process.send()

module.exports = function serializeValue(value) {
	if (typeof value === 'object') {
		return destroyCircular(value);
	}
	if (typeof value === 'function') {
		// JSON.stringify discards functions
		return '[Function ' + value.name + ']';
	}
	return value;
};
