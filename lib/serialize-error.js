'use strict';
const cleanYamlObject = require('clean-yaml-object');
const StackUtils = require('stack-utils');
const prettyFormat = require('pretty-format');
const reactElementPlugin = require('pretty-format/plugins/ReactElement');
const reactTestPlugin = require('pretty-format/plugins/ReactTestComponent');
const renderer = require('react-test-renderer');
const beautifyStack = require('./beautify-stack');

function findFirstStackLine(stack) {
	const lines = stack.split('\n');
	let line;

	while (line = lines.shift()) {
		if (/.+ \(.+:[0-9]+:[0-9]+\)/.test(line)) {
			return line;
		}
	}

	return '';
}

function isReactElement(obj) {
	return obj.type && obj.ref !== undefined && obj.props;
}

function serializeValue(value) {
	if (isReactElement(value)) {
		value = renderer.create(value).toJSON();
	}

	return prettyFormat(value, {
		plugins: [reactTestPlugin, reactElementPlugin],
		highlight: true
	});
}

function filter(propertyName, isRoot, source, target) {
	if (!isRoot) {
		return true;
	}

	if (propertyName === 'stack') {
		target.stack = beautifyStack(source.stack);
		return false;
	}

	if (propertyName === 'statements') {
		if (source.showOutput) {
			target.statements = JSON.stringify(source[propertyName].map(statement => {
				const path = statement[0];
				const value = serializeValue(statement[1]);

				return [path, value];
			}));
		}

		return false;
	}

	if (propertyName === 'actual' || propertyName === 'expected') {
		if (source.showOutput) {
			const value = source[propertyName];
			target[propertyName + 'Type'] = typeof value;
			target[propertyName] = serializeValue(value);
		}

		return false;
	}

	return true;
}

const stackUtils = new StackUtils();

module.exports = error => {
	const err = cleanYamlObject(error, filter);

	const source = stackUtils.parseLine(findFirstStackLine(err.stack));
	if (source) {
		err.source = {
			file: source.file.trim(),
			line: source.line
		};
	}

	return err;
};
