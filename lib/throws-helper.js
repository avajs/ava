'use strict';
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const globals = require('./globals');

module.exports = error => {
	if (!error || !error._avaThrowsHelperData) {
		return;
	}

	const data = error._avaThrowsHelperData;
	const codeFrame = require('babel-code-frame');
	let frame = '';

	try {
		const rawLines = fs.readFileSync(data.filename, 'utf8');
		frame = codeFrame(rawLines, data.line, data.column, {highlightCode: true});
	} catch (err) {
		console.warn(err);
	}

	console.error(
		[
			'Improper usage of t.throws detected at ' + chalk.bold.yellow('%s (%d:%d)') + ':',
			frame,
			'The first argument to t.throws should be wrapped in a function:',
			chalk.cyan('  t.throws(function() {\n    %s\n  })'),
			'Visit the following URL for more details:',
			'  ' + chalk.blue.underline('https://github.com/avajs/ava#throwsfunctionpromise-error-message')
		].join('\n\n'),
		path.relative(globals.options.baseDir, data.filename),
		data.line,
		data.column,
		data.source
	);
};
