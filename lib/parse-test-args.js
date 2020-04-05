'use strict';
const macroTitleFns = new WeakMap();

function parseTestArgs(args, {
	allowExperimentalMacros,
	allowImplementationTitleFns,
	allowMultipleImplementations
}) {
	const rawTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const receivedImplementationArray = Array.isArray(args[0]);
	const implementations = receivedImplementationArray ? args.shift() : args.splice(0, 1);

	if (receivedImplementationArray && !allowMultipleImplementations) {
		throw new Error('test(), test.serial() and hooks no longer take arrays of implementations or macros');
	}

	if (allowExperimentalMacros) {
		// TODO: Clean this up after removing the legacy implementation which
		// allows multiple implementations.
		const [possibleMacro] = implementations;
		if (possibleMacro !== null && typeof possibleMacro === 'object' && typeof possibleMacro.exec === 'function') {
			// Never call exec() on the macro object.
			let {exec} = possibleMacro;
			if (typeof possibleMacro.title === 'function') {
				// Wrap so we can store the title function against *this use* of the macro.
				exec = exec.bind(null);
				macroTitleFns.set(exec, possibleMacro.title);
			}

			implementations[0] = exec;
		}
	}

	const buildTitle = implementation => {
		let title = rawTitle;
		if (implementation.title) {
			if (!allowImplementationTitleFns) {
				throw new Error('Test and hook implementations can no longer have a title function');
			}

			title = implementation.title(rawTitle, ...args);
		} else if (macroTitleFns.has(implementation)) {
			title = macroTitleFns.get(implementation)(rawTitle, ...args);
		}

		return {title, isSet: typeof title !== 'undefined', isValid: typeof title === 'string', isEmpty: !title};
	};

	return {args, buildTitle, implementations, rawTitle, receivedImplementationArray};
}

module.exports = parseTestArgs;
