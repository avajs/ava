'use strict';
const os = require('os');
const lolex = require('lolex');

const fixColors = () => {
	// Force consistent and high-fidelity logs.
	process.env.FORCE_COLOR = 3;
	Object.defineProperty(process, 'platform', {value: 'darwin', enumerable: true, configurable: true});
};

module.exports = () => {
	// Fix timestamps.
	const clock = lolex.install({
		now: new Date(2014, 11, 19, 17, 19, 12, 200).getTime(),
		toFake: [
			'Date'
		]
	});

	// Fix line endings.
	Object.defineProperty(os, 'EOL', {value: '\n'});

	fixColors();
	require('../../lib/chalk').set({enabled: true, level: 3});

	return {
		restoreClock() {
			clock.uninstall();
		}
	};
};

module.exports.onlyColors = fixColors;
