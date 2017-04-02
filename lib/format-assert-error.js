'use strict';
const prettyFormat = require('@ava/pretty-format');
const reactTestPlugin = require('@ava/pretty-format/plugins/ReactTestComponent');
const chalk = require('chalk');
const diff = require('diff');
const DiffMatchPatch = require('diff-match-patch');
const indentString = require('indent-string');
const globals = require('./globals');

function formatValue(value, options) {
	return prettyFormat(value, Object.assign({
		callToJSON: false,
		plugins: [reactTestPlugin],
		highlight: globals.options.color !== false
	}, options));
}
exports.formatValue = formatValue;

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

const getType = value => {
	const type = typeof value;
	if (type === 'object') {
		if (type === null) {
			return 'null';
		}
		if (Array.isArray(value)) {
			return 'array';
		}
	}
	return type;
};

function formatDiff(actual, expected) {
	const actualType = getType(actual);
	const expectedType = getType(expected);
	if (actualType !== expectedType) {
		return null;
	}

	if (actualType === 'array' || actualType === 'object') {
		const formatted = diff.createPatch('string', formatValue(actual), formatValue(expected))
			.split('\n')
			.slice(4)
			.map(cleanUp)
			.filter(Boolean)
			.join('\n')
			.trimRight();

		return {label: 'Difference:', formatted};
	}

	if (actualType === 'string') {
		const formatted = new DiffMatchPatch()
			.diff_main(formatValue(actual, {highlight: false}), formatValue(expected, {highlight: false}))
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

		return {label: 'Difference:', formatted};
	}

	return null;
}
exports.formatDiff = formatDiff;

function formatWithLabel(label, value) {
	return {label, formatted: formatValue(value)};
}
exports.formatWithLabel = formatWithLabel;

function formatSerializedError(error) {
	if (error.statements.length === 0 && error.values.length === 0) {
		return null;
	}

	let result = error.values
		.map(value => `${value.label}\n\n${indentString(value.formatted, 2).trimRight()}\n`)
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
exports.formatSerializedError = formatSerializedError;
