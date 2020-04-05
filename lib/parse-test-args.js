'use strict';
function parseTestArgs(args, {allowImplementationTitleFns, allowMultipleImplementations}) {
	const rawTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const receivedImplementationArray = Array.isArray(args[0]);
	const implementations = receivedImplementationArray ? args.shift() : args.splice(0, 1);

	if (receivedImplementationArray && !allowMultipleImplementations) {
		throw new Error('test(), test.serial() and hooks no longer take arrays of implementations or macros');
	}

	const buildTitle = implementation => {
		let title = rawTitle;
		if (implementation.title) {
			if (!allowImplementationTitleFns) {
				throw new Error('Test and hook implementations can no longer have a title function');
			}

			title = implementation.title(rawTitle, ...args);
		}

		return {title, isSet: typeof title !== 'undefined', isValid: typeof title === 'string', isEmpty: !title};
	};

	return {args, buildTitle, implementations, rawTitle, receivedImplementationArray};
}

module.exports = parseTestArgs;
