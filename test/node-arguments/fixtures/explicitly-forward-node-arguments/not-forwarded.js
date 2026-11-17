import process from 'node:process';

import test from 'ava';

test('process.execArgv is not forwarded', t => {
	t.false(process.execArgv.includes('--import'));
});
