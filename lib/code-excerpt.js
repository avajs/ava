import fs from 'node:fs';

import truncate from 'cli-truncate';
import codeExcerpt from 'code-excerpt';

import {chalk} from './chalk.js';

const formatLineNumber = (lineNumber, maxLineNumber) =>
	' '.repeat(Math.max(0, String(maxLineNumber).length - String(lineNumber).length)) + lineNumber;

export default function exceptCode(source, options = {}) {
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
		value: truncate(item.value, maxWidth - String(line).length - 5),
	}));

	const extendedWidth = Math.max(...lines.map(item => item.value.length));

	return lines
		.map(item => {
			const isErrorSource = item.line === line;

			const lineNumber = formatLineNumber(item.line, line) + ':';
			const coloredLineNumber = isErrorSource ? lineNumber : chalk.grey(lineNumber);
			const result = ` ${coloredLineNumber} ${item.value.padEnd(extendedWidth)}`;

			return isErrorSource ? chalk.bgRed(result) : result;
		})
		.join('\n');
}
