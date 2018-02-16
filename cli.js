#!/usr/bin/env node
'use strict';
const debug = require('debug')('ava');
const importLocal = require('import-local');

// Prefer the local installation of AVA
if (importLocal(__filename)) {
	debug('Using local install of AVA');
} else {
	try {
		require('./lib/cli').run();
	} catch (err) {
		console.error(`\n  ${err.message}`);
		process.exit(1);
	}
}
