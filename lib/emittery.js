'use strict';
try {
	module.exports = require('emittery');
} catch (_) {
	/* istanbul ignore next */
	module.exports = require('emittery/legacy');
}
