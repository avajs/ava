#!/usr/bin/env node
'use strict';
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const TTYStream = require('./tty-stream');

const lines = fs.readFileSync(process.argv[2], 'utf8').split(TTYStream.SEPARATOR.toString('utf8'));
const delay = () => new Promise(resolve => setTimeout(resolve, 1000));

(async () => {
	while (lines.length > 0) {
		process.stdout.write(lines.shift());
		await delay();
	}
})();
