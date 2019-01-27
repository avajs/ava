'use strict';
const path = require('path');
const cleanYamlObject = require('clean-yaml-object');
const concordance = require('concordance');
const isError = require('is-error');
const StackUtils = require('stack-utils');
const assert = require('./assert');
const beautifyStack = require('./beautify-stack');
const concordanceOptions = require('./concordance-options').default;

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
	const isDependency = isWithinProject && path.dirname(rel).split(path.sep).includes('node_modules');

	return {
		isDependency,
		isWithinProject,
		file,
		line: source.line
	};
}

function trySerializeError(err, shouldBeautifyStack) {
	const stack = shouldBeautifyStack ? beautifyStack(err.stack) : err.stack;

	const retval = {
		avaAssertionError: isAvaAssertionError(err),
		nonErrorObject: false,
		source: buildSource(extractSource(stack)),
		stack
	};

	if (err.actualStack) {
		retval.stack = shouldBeautifyStack ? beautifyStack(err.actualStack) : err.actualStack;
	}

	if (retval.avaAssertionError) {
		retval.improperUsage = err.improperUsage;
		retval.message = err.message;
		retval.name = err.name;
		retval.statements = err.statements;
		retval.values = err.values;

		if (err.fixedSource) {
			const source = buildSource(err.fixedSource);
			if (source) {
				retval.source = source;
			}
		}

		if (err.assertion) {
			retval.assertion = err.assertion;
		}

		if (err.operator) {
			retval.operator = err.operator;
		}
	} else {
		retval.object = cleanYamlObject(err, filter); // Cleanly copy non-standard properties
		if (typeof err.message === 'string') {
			retval.message = err.message;
		}

		if (typeof err.name === 'string') {
			retval.name = err.name;
		}
	}

	if (typeof err.stack === 'string') {
		const lines = err.stack.split('\n');
		if (err.name === 'SyntaxError' && !lines[0].startsWith('SyntaxError')) {
			retval.summary = '';
			for (const line of lines) {
				retval.summary += line + '\n';
				if (line.startsWith('SyntaxError')) {
					break;
				}
			}

			retval.summary = retval.summary.trim();
		} else {
			// Skip the source line header inserted by `esm`:
			// <https://github.com/standard-things/esm/wiki/improved-errors>
			const start = lines.findIndex(line => !/:\d+$/.test(line));
			retval.summary = '';
			for (let index = start; index < lines.length; index++) {
				if (lines[index].startsWith('    at')) {
					break;
				}

				const next = index + 1;
				const end = next === lines.length || lines[next].startsWith('    at');
				retval.summary += end ? lines[index] : lines[index] + '\n';
			}
		}
	}

	return retval;
}

function serializeError(origin, shouldBeautifyStack, err) {
	if (!isError(err)) {
		return {
			avaAssertionError: false,
			nonErrorObject: true,
			formatted: concordance.formatDescriptor(concordance.describe(err, concordanceOptions), concordanceOptions)
		};
	}

	try {
		return trySerializeError(err, shouldBeautifyStack);
	} catch (_) {
		const replacement = new Error(`${origin}: Could not serialize error`);
		return {
			avaAssertionError: false,
			nonErrorObject: false,
			name: replacement.name,
			message: replacement.message,
			stack: replacement.stack,
			summary: replacement.message
		};
	}
}

module.exports = serializeError;
