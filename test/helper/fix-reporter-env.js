'use strict';
const lolex = require('lolex');

const fixColors = () => {
	// Force consistent and high-fidelity logs.
	process.env.FORCE_COLOR = 3;
	Object.defineProperty(process, 'platform', {value: 'darwin', enumerable: true, configurable: true});
};

module.exports = () => {
	// Fix timestamps.
	lolex.install({
		now: new Date(2014, 11, 19, 17, 19, 12, 200).getTime(),
		toFake: [
			'Date'
		]
	});

	fixColors();
	require('../../lib/chalk').set({enabled: true, level: 3});
};

module.exports.onlyColors = fixColors;
