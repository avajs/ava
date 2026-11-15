import process from 'node:process';

import test from 'ava';

test('process.execArgv is forwarded', t => {
	t.true(process.execArgv.includes('--import'));
});
