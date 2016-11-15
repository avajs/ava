'use strict';

const fs = require('fs');
const equalLength = require('equal-length');
const codeExcerpt = require('code-excerpt');
const truncate = require('cli-truncate');
const chalk = require('chalk');

function formatLineNumber(line, maxLines) {
	return ' '.repeat(String(maxLines).length - String(line).length) + line;
}

module.exports = (file, line, options) => {
	const maxWidth = (options || {}).maxWidth || 80;
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
