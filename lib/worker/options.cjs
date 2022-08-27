'use strict';
let options = null;
exports.get = () => {
	if (!options) {
		throw new Error('Options have not yet been set');
	}

	return options;
};

exports.set = newOptions => {
	if (options) {
		throw new Error('Options have already been set');
	}

	options = newOptions;
};
