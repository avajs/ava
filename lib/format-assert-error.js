'use strict';
const indentString = require('indent-string');
const stripAnsi = require('strip-ansi');
const chalk = require('chalk');
const diff = require('diff');
const DiffMatchPatch = require('diff-match-patch');

const cleanUp = line => {
	if (line[0] === '+') {
		return `${chalk.green('+')} ${line.slice(1)}`;
	}

	if (line[0] === '-') {
		return `${chalk.red('-')} ${line.slice(1)}`;
	}

	if (line.match(/@@/)) {
		return null;
	}

	if (line.match(/\\ No newline/)) {
		return null;
	}

	return ` ${line}`;
};

module.exports = err => {
	if (err.statements) {
		const statements = JSON.parse(err.statements);

		return statements
			.map(statement => `${statement[0]}\n${chalk.grey('=>')} ${statement[1]}`)
			.join('\n\n') + '\n';
	}

	if ((err.actualType === 'object' || err.actualType === 'array') && err.actualType === err.expectedType) {
		const patch = diff.createPatch('string', err.actual, err.expected);
		const msg = patch
			.split('\n')
			.slice(4)
			.map(cleanUp)
			.filter(Boolean)
			.join('\n');

		return `Difference:\n\n${msg}`;
	}

	if (err.actualType === 'string' && err.expectedType === 'string') {
		const diffMatchPatch = new DiffMatchPatch();
		const patch = diffMatchPatch.diff_main(stripAnsi(err.actual), stripAnsi(err.expected));
		const msg = patch
			.map(part => {
				if (part[0] === 1) {
					return chalk.bgGreen.black(part[1]);
				}

				if (part[0] === -1) {
					return chalk.bgRed.black(part[1]);
				}

				return chalk.red(part[1]);
			})
			.join('');

		return `Difference:\n\n${msg}\n`;
	}

	if (typeof err.actual === 'string' && typeof err.expected === 'string') {
		return `Actual:

${indentString(err.actual, 2)}

Expected:

${indentString(err.expected, 2)}
`;
	}

	return null;
};
