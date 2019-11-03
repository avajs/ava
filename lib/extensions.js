const legacy = (enhancementsOnly, babelIsEnabled, babelOnly) => {
	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = [];
	const seen = new Set();
	for (const ext of [...enhancementsOnly, ...babelOnly]) {
		if (seen.has(ext)) {
			duplicates.push(ext);
		} else {
			seen.add(ext);
		}
	}

	// Decide if and where to add the default `js` extension. Keep in mind it's not
	// added if extensions have been explicitly given.
	if (!seen.has('js')) {
		if (babelIsEnabled && babelOnly.length === 0) {
			seen.add('js');
			babelOnly.push('js');
		}

		if (!babelIsEnabled && enhancementsOnly.length === 0) {
			seen.add('js');
			enhancementsOnly.push('js');
		}
	} else if (babelIsEnabled && babelOnly.length === 0) {
		// If Babel is not disabled, and has the default extensions (or, explicitly,
		// no configured extensions), then the `js` extension must have come from
		// the `enhancementsOnly` value. That's not allowed since it'd be a
		// roundabout way of disabling Babel.
		throw new Error('Cannot specify generic \'js\' extension without disabling AVA\'s Babel usage.');
	}

	if (duplicates.length > 0) {
		throw new Error(`Unexpected duplicate extensions in options: '${duplicates.join('\', \'')}'.`);
	}

	return {all: [...seen], enhancementsOnly, babelOnly};
};

const noBabelOutOfTheBox = (extensions = [], babelOnly = []) => {
	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = [];
	const seen = new Set();
	for (const ext of [...extensions, ...babelOnly]) {
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
	// and `extensions` has not been explicitly given, default it to `js`.
	if (!seen.has('js') && extensions === undefined) {
		seen.add('js');
	}

	return {all: [...seen], babelOnly};
};

module.exports = (configuredExtensions, babelProvider, {experiments = {}} = {}) => {
	const babelIsEnabled = babelProvider !== undefined && babelProvider.isEnabled();
	const babelExtensions = babelIsEnabled ? babelProvider.getExtensions() : [];

	if (experiments.noBabelOutOfTheBox) {
		return noBabelOutOfTheBox(configuredExtensions, babelExtensions);
	}

	return legacy(configuredExtensions || [], babelIsEnabled, babelExtensions);
};
