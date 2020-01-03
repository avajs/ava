module.exports = (configuredExtensions, babelProvider) => {
	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = new Set();
	const seen = new Set();
	const combine = extensions => {
		for (const ext of extensions) {
			if (seen.has(ext)) {
				duplicates.add(ext);
			} else {
				seen.add(ext);
			}
		}
	};

	if (configuredExtensions !== undefined) {
		combine(configuredExtensions);
	}

	if (babelProvider !== undefined) {
		combine(babelProvider.extensions);
	}

	if (duplicates.size > 0) {
		throw new Error(`Unexpected duplicate extensions in options: '${[...duplicates].join('\', \'')}'.`);
	}

	// Unless the default was used by `babelProvider`, as long as the extensions aren't explicitly set, set the default.
	if (configuredExtensions === undefined) {
		if (!seen.has('cjs')) {
			seen.add('cjs');
		}

		if (!seen.has('js')) {
			seen.add('js');
		}
	}

	return [...seen];
};
