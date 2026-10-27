export function getAssertionStack(constructorOpt = getAssertionStack) {
	const {stackTraceLimit: limitBefore} = Error;
	Error.stackTraceLimit = Infinity; // eslint-disable-line unicorn/no-nonstandard-builtin-properties
	const temporary = {};
	Error.captureStackTrace(temporary, constructorOpt); // eslint-disable-line unicorn/no-nonstandard-builtin-properties
	Error.stackTraceLimit = limitBefore; // eslint-disable-line unicorn/no-nonstandard-builtin-properties
	return temporary.stack;
}

export class AssertionError extends Error {
	constructor(message = '', {
		assertion,
		assertionStack = getAssertionStack(AssertionError),
		formattedDetails = [],
		improperUsage = null,
		cause,
	} = {}) {
		super(message, {cause});
		this.name = 'AssertionError';

		this.assertion = assertion;
		this.assertionStack = assertionStack;
		this.improperUsage = improperUsage;
		this.formattedDetails = formattedDetails;
	}
}
