'use strict';
const fs = require('fs');
const equalLength = require('equal-length');
const codeExcerpt = require('code-excerpt');
const truncate = require('cli-truncate');
const chalk = require('./chalk').get();

const formatLineNumber = (lineNumber, maxLineNumber) =>
	' '.repeat(Math.max(0, String(maxLineNumber).length - String(lineNumber).length)) + lineNumber;

module.exports = (source, options = {}) => {
	if (!source.isWithinProject || source.isDependency) {
		return null;
	}

	const {file, line} = source;
	const maxWidth = options.maxWidth || 80;

	let contents;
	try {
		contents = fs.readFileSync(file, 'utf8');
	} catch (_) {
		return null;
	}

	const excerpt = codeExcerpt(contents, line, {around: 1});
	if (!excerpt) {
		return null;
	}

	const lines = excerpt.map(item => ({
		line: item.line,
		value: truncate(item.value, maxWidth - String(line).length - 5)
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
