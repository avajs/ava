'use strict';
const fs = require('fs');
const path = require('path');

const text = fs.readFileSync(path.join(__dirname, 'lorem-ipsum.txt'), 'utf8');
const lines = text.split(/\r?\n/g).map(line => line.split(' '));

setTimeout(() => {
	let lineNum = 0;
	let wordNum = 0;

	const interval = setInterval(() => {
		if (lineNum >= lines.length) {
			clearInterval(interval);
			return;
		}

		const line = lines[lineNum];
		if (wordNum >= line.length) {
			process.stdout.write('\n');
			lineNum++;
			wordNum = 0;
			return;
		}

		let word = line[wordNum];
		wordNum++;
		if (wordNum < line.length) {
			word += ' ';
		}

		process.stdout.write(word);
	}, 50);
}, 200);
