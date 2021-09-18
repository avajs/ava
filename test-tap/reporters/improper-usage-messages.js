import {test} from 'tap';

import improperUsageMessages from '../../lib/reporters/improper-usage-messages.js';

test('results when nothing is applicable', t => {
	const err = {
		assertion: 'assertion',
		improperUsage: {
			name: 'VersionMismatchError',
			snapPath: 'path',
			snapVersion: 2,
			expectedVersion: 1,
		},
	};

	const actualOutput = improperUsageMessages(err);

	t.equal(actualOutput, null);
	t.end();
});
