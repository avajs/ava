#!/usr/bin/env node
import fs from 'node:fs';

import delay from 'delay';

import TTYStream from './tty-stream.js';

const lines = fs.readFileSync(process.argv[2], 'utf8').split(TTYStream.SEPARATOR.toString('utf8'));

while (lines.length > 0) {
	process.stdout.write(lines.shift());
	// eslint-disable-next-line no-await-in-loop
	await delay();
}
