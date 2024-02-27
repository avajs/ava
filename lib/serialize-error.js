import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isNativeError} from 'node:util/types';

import concordance from 'concordance';
import StackUtils from 'stack-utils';

import {AssertionError} from './assert.js';
import concordanceOptions from './concordance-options.js';

function isAvaAssertionError(source) {
	return source instanceof AssertionError;
}

function normalizeFile(file, ...base) {
	return file.startsWith('file://') ? file : pathToFileURL(path.resolve(...base, file)).toString();
}

const stackUtils = new StackUtils();
function extractSource(stack, testFile) {
	if (!stack || !testFile) {
		return null;
	}

	testFile = normalizeFile(testFile);

	for (const line of stack.split('\n')) {
		const callSite = stackUtils.parseLine(line);
		if (callSite && normalizeFile(callSite.file) === testFile) {
			return {
				isDependency: false,
				isWithinProject: true,
				file: testFile,
				line: callSite.line,
			};
		}
	}

	return null;
}

const workerErrors = new WeakSet();
export function tagWorkerError(error) {
	// Track worker errors, which aren't native due to https://github.com/nodejs/node/issues/48716.
	// Still include the check for isNativeError() in case the issue is fixed in the future.
	if (isNativeError(error) || error instanceof Error) {
		workerErrors.add(error);
	}

	return error;
}

const isWorkerError = error => workerErrors.has(error);

export default function serializeError(error, {testFile = null} = {}) {
	if (!isNativeError(error) && !isWorkerError(error)) {
		return {
			type: 'unknown',
			originalError: error, // Note that the main process receives a structured clone.
			formattedError: concordance.formatDescriptor(concordance.describe(error, concordanceOptions), concordanceOptions),
		};
	}

	const {message, name, stack} = error;
	const base = {
		message,
		name,
		originalError: error, // Note that the main process receives a structured clone.
		stack,
	};

	if (!isAvaAssertionError(error)) {
		if (name === 'AggregateError') {
			return {
				...base,
				type: 'aggregate',
				errors: error.errors.map(error => serializeError(error, {testFile})),
			};
		}

		return {
			...base,
			type: 'native',
			source: extractSource(error.stack, testFile),
		};
	}

	return {
		...base,
		type: 'ava',
		assertion: error.assertion,
		improperUsage: error.improperUsage,
		formattedCause: error.cause ? concordance.formatDescriptor(concordance.describe(error.cause, concordanceOptions), concordanceOptions) : null,
		formattedDetails: error.formattedDetails,
		source: extractSource(error.assertionStack, testFile),
		stack: isNativeError(error.cause) ? error.cause.stack : error.assertionStack,
	};
}
