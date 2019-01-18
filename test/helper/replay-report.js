#!/usr/bin/env node
'use strict';
const fs = require('fs');
const delay = require('delay');
const TTYStream = require('./tty-stream');

const lines = fs.readFileSync(process.argv[2], 'utf8').split(TTYStream.SEPARATOR.toString('utf8'));

(async () => {
	while (lines.length > 0) {
		process.stdout.write(lines.shift());
		// eslint-disable-next-line no-await-in-loop
		await delay();
	}
})();
