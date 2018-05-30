'use strict';
try {
	module.exports = require('emittery');
} catch (err) {
	module.exports = require('emittery/legacy');
}
