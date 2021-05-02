import {test} from 'tap';

import {set} from '../lib/chalk.js';

test('throws an error when trying to set chalk config and chalk config is configured', t => {
	set({});
	t.throws(set, 'Chalk has already been configured');
	t.end();
});
