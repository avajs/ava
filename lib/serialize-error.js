'use strict';
const path = require('path');
const cleanYamlObject = require('clean-yaml-object');
const StackUtils = require('stack-utils');
const assert = require('./assert');
const beautifyStack = require('./beautify-stack');

function isAvaAssertionError(source) {
	return source instanceof assert.AssertionError;
}

function filter(propertyName, isRoot) {
	return !isRoot || (propertyName !== 'message' && propertyName !== 'name' && propertyName !== 'stack');
}

const stackUtils = new StackUtils();
function extractSource(stack) {
	if (!stack) {
		return null;
	}

	const firstStackLine = stack.split('\n')[0];
	return stackUtils.parseLine(firstStackLine);
}
function buildSource(source) {
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

	const retval = {
		avaAssertionError: isAvaAssertionError(error),
		source: buildSource(extractSource(stack))
	};
	if (stack) {
		retval.stack = stack;
	}

	if (retval.avaAssertionError) {
		retval.improperUsage = error.improperUsage;
		retval.message = error.message;
		retval.name = error.name;
		retval.statements = error.statements;
		retval.values = error.values;

		if (error.fixedSource) {
			const source = buildSource(error.fixedSource);
			if (source) {
				retval.source = source;
			}
		}

		if (error.assertion) {
			retval.assertion = error.assertion;
		}
		if (error.operator) {
			retval.operator = error.operator;
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

	if (typeof error.stack === 'string') {
		retval.summary = error.stack.split('\n')[0];
	} else {
		retval.summary = JSON.stringify(error);
	}

	return retval;
};
