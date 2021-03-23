'use strict';
const path = require('path');
const cleanYamlObject = require('clean-yaml-object');
const concordance = require('concordance');
const isError = require('is-error');
const slash = require('slash');
const StackUtils = require('stack-utils');
const assert = require('./assert');
const concordanceOptions = require('./concordance-options').default;

function isAvaAssertionError(source) {
	return source instanceof assert.AssertionError;
}

function filter(propertyName, isRoot) {
	return !isRoot || (propertyName !== 'message' && propertyName !== 'name' && propertyName !== 'stack');
}

const stackUtils = new StackUtils();
function extractSource(stack, testFile) {
	if (!stack || !testFile) {
		return null;
	}

	// Normalize the test file so it matches `callSite.file`.
	const relFile = path.relative(process.cwd(), testFile);
	const normalizedFile = process.platform === 'win32' ? slash(relFile) : relFile;
	for (const line of stack.split('\n')) {
		try {
			const callSite = stackUtils.parseLine(line);
			if (callSite.file === normalizedFile) {
				return {
					isDependency: false,
					isWithinProject: true,
					file: path.resolve(process.cwd(), callSite.file),
					line: callSite.line
				};
			}
		} catch {}
	}

	return null;
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

	const [segment] = rel.split(path.sep);
	const isWithinProject = segment !== '..' && (process.platform !== 'win32' || !segment.includes(':'));
	const isDependency = isWithinProject && path.dirname(rel).split(path.sep).includes('node_modules');

	return {
		isDependency,
		isWithinProject,
		file,
		line: source.line
	};
}

function trySerializeError(error, shouldBeautifyStack, testFile, testLine) {
	const stack = error.savedError ? error.savedError.stack : error.stack;

	const retval = {
		avaAssertionError: isAvaAssertionError(error),
		nonErrorObject: false,
		source: extractSource(stack, testFile),
		stack,
		shouldBeautifyStack
	};

	if (error.actualStack) {
		retval.stack = error.actualStack;
	}

	retval.stack += `\n${testLine}`;

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
		const lines = error.stack.split('\n');
		if (error.name === 'SyntaxError' && !lines[0].startsWith('SyntaxError')) {
			retval.summary = '';
			for (const line of lines) {
				retval.summary += line + '\n';
				if (line.startsWith('SyntaxError')) {
					break;
				}
			}

			retval.summary = retval.summary.trim();
		} else {
			retval.summary = '';
			for (let index = 0; index < lines.length; index++) {
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

function serializeError(origin, shouldBeautifyStack, error, testFile, testLine) {
	if (!isError(error)) {
		return {
			avaAssertionError: false,
			nonErrorObject: true,
			formatted: concordance.formatDescriptor(concordance.describe(error, concordanceOptions), concordanceOptions)
		};
	}

	try {
		return trySerializeError(error, shouldBeautifyStack, testFile, testLine);
	} catch {
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
