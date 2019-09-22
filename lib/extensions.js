module.exports = (configuredExtensions, babelConfig, {experiments = {}} = {}) => {
	// Combine all extensions possible for testing. Remove duplicate extensions.
	const duplicates = [];
	const seen = new Set();

	let all = [];
	let enhancementsOnly = [];
	let full = [];

	if (experiments.noBabelOutOfTheBox) {
		if (babelConfig) {
			// When this experiment is opted into, the Babel pipeline takes care of
			// compiling enhancements, so `enhancementsOnly` can be left empty.
			({extensions: full = []} = babelConfig);
		} else {
			all = configuredExtensions;
		}
	} else {
		enhancementsOnly = configuredExtensions;
		({extensions: full = []} = babelConfig || {});
	}

	for (const ext of [...all, ...enhancementsOnly, ...full]) {
		if (seen.has(ext)) {
			duplicates.push(ext);
		} else {
			seen.add(ext);
		}
	}

	// Decide if and where to add the default `js` extension. Keep in mind it's not
	// added if extensions have been explicitly given.
	if (!seen.has('js')) {
		if (experiments.noBabelOutOfTheBox) {
			seen.add('js');
			if (babelConfig && full.length === 0) {
				full.push('js');
			}
		} else {
			if (babelConfig && full.length === 0) {
				seen.add('js');
				full.push('js');
			}

			if (!babelConfig && enhancementsOnly.length === 0) {
				seen.add('js');
				enhancementsOnly.push('js');
			}
		}
	} else if (!experiments.noBabelOutOfTheBox && babelConfig && full.length === 0) {
		// If Babel is not disabled, and has the default extensions (or, explicitly,
		// no configured extensions), then the `js` extension must have come from
		// the `enhancementsOnly` value. That's not allowed since it'd be a
		// roundabout way of disabling Babel.
		throw new Error('Cannot specify generic \'js\' extension without disabling AVA\'s Babel usage.');
	}

	if (duplicates.length > 0) {
		throw new Error(`Unexpected duplicate extensions in options: '${duplicates.join('\', \'')}'.`);
	}

	all = [...seen];
	return {all, enhancementsOnly, full};
};
