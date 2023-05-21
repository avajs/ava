import test from 'ava';

import cjs from './required.cjs';
import {receivedArgs} from './required.mjs';

test('receives arguments from config', t => {
	t.deepEqual(receivedArgs, ['hello', 'world']);
	t.deepEqual(cjs.receivedArgs, ['goodbye']);
});

test('ok to load for side-effects', async t => {
	const now = Date.now();
	const sideEffect = await import('./side-effect.js');
	t.true(sideEffect.default < now);
});
