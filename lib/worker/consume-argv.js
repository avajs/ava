'use strict';
let options = {};

if (process.argv[2] && process.argv[2].indexOf('{') > -1) {
	options = JSON.parse(process.argv[2]);
	// Remove arguments received from fork.js and leave those specified by the user.
	process.argv.splice(2, 2);
} else {
	// If file wasn't defined in argv we should be in a worker
	// if not then subprocess was probably required directly
	try {
		/* eslint-disable-next-line import/no-unresolved */
		const {workerData} = require('worker_threads');
		options = workerData;
	} catch (_) {}
}

require('./options').set(options);
