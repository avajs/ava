import test from 'ava';

import {receivedArgs} from './required.mjs';

test('non-JSON arguments can be provided', t => {
	t.deepEqual(receivedArgs, [new Map([['hello', 'world']])]);
});
