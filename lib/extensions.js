module.exports = (enhancementsOnly, babelConfig) => {
	const {extensions: full = []} = babelConfig || {};

	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = [];
	const seen = new Set();
	for (const ext of [...enhancementsOnly, ...full]) {
		if (seen.has(ext)) {
			duplicates.push(ext);
		} else {
			seen.add(ext);
		}
	}

	// Decide if and where to add the default `js` extension. Keep in mind it's not
	// added if extensions have been explicitly given.
	if (!seen.has('js')) {
		if (babelConfig && full.length === 0) {
			seen.add('js');
			full.push('js');
		}

		if (!babelConfig && enhancementsOnly.length === 0) {
			seen.add('js');
			enhancementsOnly.push('js');
		}
	} else if (babelConfig && full.length === 0) {
		// If Babel is not disabled, and has the default extensions (or, explicitly,
		// no configured extensions), thes the `js` extension must have come from
		// the `enhancementsOnly` value. That's not allowed since it'd be a
		// roundabout way of disabling Babel.
		throw new Error('Cannot specify generic \'js\' extension without disabling AVA\'s Babel usage.');
	}

	if (duplicates.length > 0) {
		throw new Error(`Unexpected duplicate extensions in options: '${duplicates.join('\', \'')}'.`);
	}

	const all = [...seen];
	return {all, enhancementsOnly, full};
};
