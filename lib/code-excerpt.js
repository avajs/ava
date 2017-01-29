'use strict';

const fs = require('fs');
const equalLength = require('equal-length');
const codeExcerpt = require('code-excerpt');
const truncate = require('cli-truncate');
const chalk = require('chalk');

const formatLineNumber = (lineNumber, maxLineNumber) => {
	return ' '.repeat(String(maxLineNumber).length - String(lineNumber).length) + lineNumber;
};

module.exports = (file, line, options) => {
	options = options || {};

	const maxWidth = options.maxWidth || 80;
	const source = fs.readFileSync(file, 'utf8');
	const excerpt = codeExcerpt(source, line, {around: 1});

	const lines = excerpt.map(item => ({
		line: item.line,
		value: truncate(item.value, maxWidth - String(line).length - 1)
	}));

	const joinedLines = lines.map(line => line.value).join('\n');
	const extendedLines = equalLength(joinedLines).split('\n');

	return lines
		.map((item, index) => ({
			line: item.line,
			value: extendedLines[index]
		}))
		.map(item => {
			const isErrorSource = item.line === line;

			const lineNumber = formatLineNumber(item.line, line) + ':';
			const coloredLineNumber = isErrorSource ? lineNumber : chalk.grey(lineNumber);
			const result = ` ${coloredLineNumber} ${item.value}`;

			return isErrorSource ? chalk.bgRed(result) : result;
		})
		.join('\n');
};
