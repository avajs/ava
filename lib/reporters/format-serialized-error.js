'use strict';
const chalk = require('chalk');
const trimOffNewlines = require('trim-off-newlines');

function formatSerializedError(error) {
	if (error.statements.length === 0 && error.values.length === 0) {
		return null;
	}

	let result = '';
	for (const value of error.values) {
		result += `${value.label}\n\n${trimOffNewlines(value.formatted)}\n\n`;
	}

	for (const statement of error.statements) {
		result += `${statement[0]}\n${chalk.grey('=>')} ${trimOffNewlines(statement[1])}\n\n`;
	}

	return trimOffNewlines(result);
}
module.exports = formatSerializedError;
