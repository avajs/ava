'use strict';
const path = require('path');
const cleanYamlObject = require('clean-yaml-object');
const StackUtils = require('stack-utils');
const prettyFormat = require('@ava/pretty-format');
const reactTestPlugin = require('@ava/pretty-format/plugins/ReactTestComponent');
const beautifyStack = require('./beautify-stack');
const extractStack = require('./extract-stack');

function serializeValue(value) {
	return prettyFormat(value, {
		callToJSON: false,
		plugins: [reactTestPlugin],
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

	if (err.stack) {
		const firstStackLine = extractStack(err.stack).split('\n')[0];
		const source = stackUtils.parseLine(firstStackLine);
		if (source) {
			// Assume the CWD is the project directory. This holds since this function
			// is only called in test workers, which are created with their working
			// directory set to the project directory.
			const projectDir = process.cwd();

			const file = path.resolve(projectDir, source.file.trim());
			const rel = path.relative(projectDir, file);

			const isWithinProject = rel.split(path.sep)[0] !== '..';
			const isDependency = isWithinProject && path.dirname(rel).split(path.sep).indexOf('node_modules') > -1;

			err.source = {
				isDependency,
				isWithinProject,
				file,
				line: source.line
			};
		}
	}

	return err;
};
