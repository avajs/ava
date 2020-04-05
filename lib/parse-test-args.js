'use strict';
function parseTestArgs(args, {allowMultipleImplementations}) {
	const rawTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const receivedImplementationArray = Array.isArray(args[0]);
	const implementations = receivedImplementationArray ? args.shift() : args.splice(0, 1);

	if (receivedImplementationArray && !allowMultipleImplementations) {
		throw new Error('test(), test.serial() and hooks no longer take arrays of implementations or macros');
	}

	const buildTitle = implementation => {
		const title = implementation.title ? implementation.title(rawTitle, ...args) : rawTitle;
		return {title, isSet: typeof title !== 'undefined', isValid: typeof title === 'string', isEmpty: !title};
	};

	return {args, buildTitle, implementations, rawTitle, receivedImplementationArray};
}

module.exports = parseTestArgs;
