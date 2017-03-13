'use strict';
const path = require('path');
const cleanYamlObject = require('clean-yaml-object');
const StackUtils = require('stack-utils');
const prettyFormat = require('@ava/pretty-format');
const reactTestPlugin = require('@ava/pretty-format/plugins/ReactTestComponent');
const assert = require('./assert');
const beautifyStack = require('./beautify-stack');
const extractStack = require('./extract-stack');

function serializeValue(value) {
	return prettyFormat(value, {
		callToJSON: false,
		plugins: [reactTestPlugin],
		highlight: true
	});
}

function isAvaAssertionError(source) {
	return source instanceof assert.AssertionError;
}

function filter(propertyName, isRoot) {
	return !isRoot || (propertyName !== 'message' && propertyName !== 'name' && propertyName !== 'stack');
}

const stackUtils = new StackUtils();
function buildSource(stack) {
	if (!stack) {
		return null;
	}

	const firstStackLine = extractStack(stack).split('\n')[0];
	const source = stackUtils.parseLine(firstStackLine);
	if (!source) {
		return null;
	}

	// Assume the CWD is the project directory. This holds since this function
	// is only called in test workers, which are created with their working
	// directory set to the project directory.
	const projectDir = process.cwd();

	const file = path.resolve(projectDir, source.file.trim());
	const rel = path.relative(projectDir, file);

	const isWithinProject = rel.split(path.sep)[0] !== '..';
	const isDependency = isWithinProject && path.dirname(rel).split(path.sep).indexOf('node_modules') > -1;

	return {
		isDependency,
		isWithinProject,
		file,
		line: source.line
	};
}

module.exports = error => {
	const stack = typeof error.stack === 'string' ?
		beautifyStack(error.stack) :
		null;
	const source = buildSource(stack);
	const retval = {
		avaAssertionError: isAvaAssertionError(error),
		source
	};
	if (stack) {
		retval.stack = stack;
	}

	if (retval.avaAssertionError) {
		retval.message = error.message;
		retval.name = error.name;

		if (error.assertion) {
			retval.assertion = error.assertion;
		}
		if (error.operator) {
			retval.operator = error.operator;
		}
		if (error.hasActual) {
			retval.actual = {
				type: typeof error.actual,
				formatted: serializeValue(error.actual)
			};
		}
		if (error.hasExpected) {
			retval.expected = {
				type: typeof error.expected,
				formatted: serializeValue(error.expected)
			};
		}
		if (error.statements) {
			retval.statements = JSON.stringify(error.statements.map(statement => {
				const path = statement[0];
				const value = serializeValue(statement[1]);

				return [path, value];
			}));
		}
	} else {
		retval.object = cleanYamlObject(error, filter); // Cleanly copy non-standard properties
		if (typeof error.message === 'string') {
			retval.message = error.message;
		}
		if (typeof error.name === 'string') {
			retval.name = error.name;
		}
	}

	return retval;
};
