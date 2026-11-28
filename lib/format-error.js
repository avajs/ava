import {inspect} from 'node:util';
import {isNativeError} from 'node:util/types';

import concordanceOptions from './concordance-options.js';
import concordance from './concordance.js';

// Concordance prints host errors like DOMException as `DOMException {}`, dropping
// message/stack. Detect that sparse form and fall back to a useful representation.
const sparseErrorFormat = /^\S+ \{\}$/;

export function formatErrorValue(label, error) {
	return {label, formatted: formatThrownValue(error)};
}

export function formatThrownValue(value) {
	const formatted = concordance().format(value, concordanceOptions);
	if (!(value instanceof Error) || !sparseErrorFormat.test(formatted.trim())) {
		return formatted;
	}

	// Prefer a concordance-like summary with message filled in; stack is reported
	// separately via serializeError / the default reporter.
	const typeName = value.constructor?.name
		|| Object.prototype.toString.call(value).slice(8, -1)
		|| 'Error';
	return `${typeName} {\n  message: ${inspect(String(value.message ?? ''))},\n}`;
}

export function isSerializableError(error, isWorkerError) {
	return isNativeError(error) || isWorkerError(error) || error instanceof Error;
}

// Structured cloning cross-realm / host Errors (e.g. jsdom DOMException) yields `{}`.
// Use a plain object so name/message/stack survive the clone (unlike `new Error`,
// whose custom `.name` is not reliably preserved by structuredClone).
export function transferableOriginalError(error, {trusted}) {
	if (trusted) {
		return error;
	}

	return {
		name: error.name,
		message: error.message,
		stack: typeof error.stack === 'string' ? error.stack : undefined,
	};
}
