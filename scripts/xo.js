#!/usr/bin/env node
/* eslint-disable import/no-unassigned-import */
'use strict';

var major = Number(process.version.match(/^v(\d+)/)[1]);
if (major >= 4) {
	require('xo/cli');
} else {
	console.warn('Linting requires Node.js >=4');
}
