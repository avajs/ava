import fs from 'fs';

import truncate from 'cli-truncate';
import codeExcerpt from 'code-excerpt';
import equalLength from 'equal-length';

import {chalk} from './chalk.js';

const formatLineNumber = (lineNumber, maxLineNumber) =>
	' '.repeat(Math.max(0, String(maxLineNumber).length - String(lineNumber).length)) + lineNumber;

export default (source, options = {}) => {
	if (!source.isWithinProject || source.isDependency) {
		return null;
	}

	const {file, line} = source;
	const maxWidth = options.maxWidth || 80;

	let contents;
	try {
		contents = fs.readFileSync(new URL(file), 'utf8');
	} catch {
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
