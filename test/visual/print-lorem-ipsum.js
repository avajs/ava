'use strict';
var fs = require('fs');
var path = require('path');
var text = fs.readFileSync(path.join(__dirname, 'lorem-ipsum.txt'), 'utf8');

var lines = text.split(/\r?\n/g).map(function (line) {
	return line.split(' ');
});

setTimeout(function () {
	var lineNum = 0;
	var wordNum = 0;

	var interval = setInterval(function () {
		if (lineNum >= lines.length) {
			clearInterval(interval);
			return;
		}
		var line = lines[lineNum];
		if (wordNum >= line.length) {
			process.stdout.write('\n');
			lineNum++;
			wordNum = 0;
			return;
		}
		var word = line[wordNum];
		wordNum++;
		if (wordNum < line.length) {
			word += ' ';
		}
		process.stdout.write(word);
	}, 50);
}, 200);
