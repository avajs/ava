export function getAssertionStack(constructorOpt = getAssertionStack) {
	const {stackTraceLimit: limitBefore} = Error;
	Error.stackTraceLimit = Number.POSITIVE_INFINITY;
	const temporary = {};
	Error.captureStackTrace(temporary, constructorOpt);
	Error.stackTraceLimit = limitBefore;
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
