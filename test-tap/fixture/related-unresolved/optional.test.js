import process from 'node:process';

import test from '../../../entrypoints/main.js';

if (process.env.RUN_OPTIONAL) {
	await import('./missing.js');
}

test('optional', t => {
	t.pass();
});
