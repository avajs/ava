'use strict';

require('../../../lib/serialize-error');

const serializeModule = require.cache[require.resolve('../../../lib/serialize-error')];

const original = serializeModule.exports;
let restored = false;
let restoreAfterFirstCall = false;
serializeModule.exports = error => {
	if (restored) {
		return original(error);
	}
	if (restoreAfterFirstCall) {
		restored = true;
	}

	throw new Error('Forced error');
};

exports.restoreAfterFirstCall = () => {
	restoreAfterFirstCall = true;
};
