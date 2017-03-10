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

module.exports = error => {
	if (error.statements) {
		const statements = JSON.parse(error.statements);

		return statements
			.map(statement => `${statement[0]}\n${chalk.grey('=>')} ${statement[1]}`)
			.join('\n\n') + '\n';
	}

	if (error.actual && error.expected) {
		if (error.actual.type === error.expected.type) {
			const type = error.actual.type;
			if (type === 'array' || type === 'object') {
				const patch = diff.createPatch('string', error.actual.formatted, error.expected.formatted);
				const msg = patch
					.split('\n')
					.slice(4)
					.map(cleanUp)
					.filter(Boolean)
					.join('\n')
					.trimRight();

				return `Difference:\n\n${msg}\n`;
			}

			if (type === 'string') {
				const diffMatchPatch = new DiffMatchPatch();
				const patch = diffMatchPatch.diff_main(stripAnsi(error.actual.formatted), stripAnsi(error.expected.formatted));
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
					.join('')
					.trimRight();

				return `Difference:\n\n${msg}\n`;
			}
		}

		return `Actual:\n\n${indentString(error.actual.formatted, 2).trimRight()}\n\n` +
			`Expected:\n\n${indentString(error.expected.formatted, 2).trimRight()}\n`;
	}

	return null;
};
