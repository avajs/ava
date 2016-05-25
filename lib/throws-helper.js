'use strict';
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var globals = require('./globals');

module.exports = function throwsHelper(error) {
	if (!error || !error._avaThrowsHelperData) {
		return;
	}

	var data = error._avaThrowsHelperData;
	var codeFrame = require('babel-code-frame');
	var frame = '';

	try {
		var rawLines = fs.readFileSync(data.filename, 'utf8');
		frame = codeFrame(rawLines, data.line, data.column, {highlightCode: true});
	} catch (e) {
		console.warn(e);
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
