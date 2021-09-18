const buildTitle = (raw, implementation, args) => {
	let value = implementation && implementation.title ? implementation.title(raw, ...args) : raw;
	const isValid = typeof value === 'string';
	if (isValid) {
		value = value.trim().replace(/\s+/g, ' ');
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
		implementation: implementation && implementation.exec ? implementation.exec : implementation,
		title: buildTitle(rawTitle, implementation, args),
	};
}
