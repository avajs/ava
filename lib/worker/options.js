let options = null;
export function get() {
	if (!options) {
		throw new Error('Options have not yet been set');
	}

	return options;
}

export function set(newOptions) {
	if (options) {
		throw new Error('Options have already been set');
	}

	options = newOptions;
}
