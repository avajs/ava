#!/usr/bin/env node
'use strict';
const path = require('path');
const debug = require('debug')('ava');

// Prefer the local installation of AVA.
const resolveCwd = require('resolve-cwd');
const localCLI = resolveCwd('ava/cli');

// Use `path.relative()` to detect local AVA installation,
// because __filename's case is inconsistent on Windows
// see https://github.com/nodejs/node/issues/6624
if (localCLI && path.relative(localCLI, __filename) !== '') {
	debug('Using local install of AVA');
	require(localCLI); // eslint-disable-line import/no-dynamic-require
} else {
	if (debug.enabled) {
		require('time-require'); // eslint-disable-line import/no-unassigned-import
	}

	try {
		require('./lib/cli').run();
	} catch (err) {
		console.error(`\n  ${err.message}`);
		process.exit(1);
	}
}
