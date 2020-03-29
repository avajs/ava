module.exports = (configuredExtensions, providers = []) => {
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

	for (const {main} of providers) {
		combine(main.extensions);
	}

	if (duplicates.size > 0) {
		throw new Error(`Unexpected duplicate extensions in options: ’${[...duplicates].join('’, ’')}’.`);
	}

	// Unless the default was used by providers, as long as the extensions aren't explicitly set, set the default.
	if (configuredExtensions === undefined) {
		if (!seen.has('cjs')) {
			seen.add('cjs');
		}

		if (!seen.has('mjs')) {
			seen.add('mjs');
		}

		if (!seen.has('js')) {
			seen.add('js');
		}
	}

	return [...seen];
};
