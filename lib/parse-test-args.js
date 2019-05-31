'use strict';
function parseTestArgs(...args) {
	const specifiedTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const receivedImplementationArray = Array.isArray(args[0]);
	const implementations = receivedImplementationArray ? args.shift() : args.splice(0, 1);
	return {args, implementations, receivedImplementationArray, specifiedTitle};
}

module.exports = parseTestArgs;
