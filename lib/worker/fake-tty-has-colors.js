'use strict';
const tty = require('tty');

// Call original method to ensure the correct errors are thrown.
const assertHasColorsArguments = count => {
	tty.WriteStream.prototype.hasColors(count);
};

const makeHasColors = colorDepth => (count = 16, env) => {
	// `count` is optional too, so make sure it's not an env object.
	if (env === undefined && typeof count === 'object' && count !== null) {
		count = 16;
	}

	assertHasColorsArguments(count);
	return count <= 2 ** colorDepth;
};

module.exports = makeHasColors;
