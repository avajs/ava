module.exports = (configuredExtensions = [], babelProvider = null) => {
	const babelExtensions = babelProvider === null ? [] : babelProvider.extensions;

	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = [];
	const seen = new Set();
	for (const ext of [...configuredExtensions, ...babelExtensions]) {
		if (seen.has(ext)) {
			duplicates.push(ext);
		} else {
			seen.add(ext);
		}
	}

	if (duplicates.length > 0) {
		throw new Error(`Unexpected duplicate extensions in options: '${duplicates.join('\', \'')}'.`);
	}

	// Assume `babelOnly` would contain the `js` extension, so if it was not seen
	// and `extensions` is empty, default it to `js`.
	if (!seen.has('js') && configuredExtensions.length === 0) {
		seen.add('js');
	}

	return [...seen];
};
