'use strict';

const serializeError = require('../../lib/serialize-error');

module.exports = function (err, options) {
	options = Object.assign({}, options);

	if (options.stack) {
		err.stack = options.stack;
	}

	const serialized = serializeError(err);

	if (options.type) {
		serialized.type = options.type;
	}

	if (options.file) {
		serialized.file = options.file;
	}

	return serialized;
};
