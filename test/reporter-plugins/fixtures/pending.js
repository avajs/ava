import process from 'node:process';
import {setTimeout} from 'node:timers/promises';

import test from '../../../entrypoints/main.js';

test('pending', async t => {
	process.stderr.write('waiting-for-interrupt\n');
	await setTimeout(60_000);
	t.pass();
});
