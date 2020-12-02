'use strict';
const path = require('path');

// Ensure the same AVA install is loaded by the test file as by the test worker
if (process.env.AVA_PATH && process.env.AVA_PATH !== __dirname) {
	module.exports = require(path.join(process.env.AVA_PATH, 'plugin'));
} else {
	module.exports = require('./lib/worker/plugin');
}
