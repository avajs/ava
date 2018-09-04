'use strict';
try {
	module.exports = require('emittery');
} catch (_) {
	module.exports = require('emittery/legacy');
}
