import {test} from 'tap';

import {chalk, set} from '../lib/chalk.js';

test('allows chalk config to be replaced', t => {
	set({level: 1});
	t.equal(chalk.level, 1);
	set({level: 2});
	t.equal(chalk.level, 2);
	t.end();
});
