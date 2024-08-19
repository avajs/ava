import os from 'node:os';

import sinon from 'sinon';

import {set as setChalk} from '../../lib/chalk.js';

const fixColors = () => {
	// Force consistent and high-fidelity logs.
	process.env.FORCE_COLOR = 3;
	Object.defineProperty(process, 'platform', {value: 'darwin', enumerable: true, configurable: true});
};

const fixReporterEnv = () => {
	// Fix timestamps.
	const clock = sinon.useFakeTimers({
		now: new Date(2014, 11, 19, 17, 19, 12, 200).getTime(),
		toFake: [
			'Date',
		],
	});

	// Fix line endings.
	Object.defineProperty(os, 'EOL', {value: '\n'});

	fixColors();
	setChalk({level: 3});

	return {
		restoreClock() {
			clock.uninstall();
		},
	};
};

export default fixReporterEnv;
export {fixColors as onlyColors};
