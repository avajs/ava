const buildTitle = (raw, implementation, args) => {
	let value = implementation?.title?.(raw, ...args) ?? raw;
	const isValid = typeof value === 'string';
	if (isValid) {
		value = value.trim().replaceAll(/\s+/g, ' ');
	}

	return {
		raw,
		value,
		isSet: value !== undefined,
		isValid,
		isEmpty: !isValid || value === '',
	};
};

export default function parseTestArgs(args) {
	const rawTitle = typeof args[0] === 'string' ? args.shift() : undefined;
	const implementation = args.shift();

	return {
		args,
		implementation: implementation?.exec ?? implementation,
		title: buildTitle(rawTitle, implementation, args),
	};
}
