'use strict';
const chalk = import('../chalk.js'); // eslint-disable-line node/no-unsupported-features/es-syntax
let setChalk;
chalk.then(chalk => {
	setChalk = chalk.set;
});

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
	if (options.chalkOptions) {
		if (setChalk) {
			setChalk(options.chalkOptions);
		} else {
			chalk.then(chalk => chalk.set(options.chalkOptions));
		}
	}
};
