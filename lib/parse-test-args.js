'use strict';
function parseTestArgs(args) {
	const rawTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const receivedImplementationArray = Array.isArray(args[0]);
	const implementations = receivedImplementationArray ? args.shift() : args.splice(0, 1);

	const buildTitle = implementation => {
		const title = implementation.title ? implementation.title(rawTitle, ...args) : rawTitle;
		return {title, isSet: typeof title !== 'undefined', isValid: typeof title === 'string', isEmpty: !title};
	};

	return {args, buildTitle, implementations, rawTitle, receivedImplementationArray};
}

module.exports = parseTestArgs;
