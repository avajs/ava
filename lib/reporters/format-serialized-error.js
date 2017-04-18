'use strict';
const chalk = require('chalk');

function formatSerializedError(error) {
	if (error.statements.length === 0 && error.values.length === 0) {
		return null;
	}

	let result = error.values
		.map(value => `${value.label}\n\n${value.formatted}\n`)
		.join('\n');

	if (error.statements.length > 0) {
		if (error.values.length > 0) {
			result += '\n';
		}

		result += error.statements
			.map(statement => `${statement[0]}\n${chalk.grey('=>')} ${statement[1]}\n`)
			.join('\n');
	}

	return result;
}
module.exports = formatSerializedError;
