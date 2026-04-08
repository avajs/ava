import test from 'ava';

import {receivedArgs} from './required-esm.js';
import requiredModule from './required.js';

test('receives arguments from config', t => {
	t.deepEqual(receivedArgs, ['hello', 'world']);
	t.deepEqual(requiredModule.receivedArgs, ['goodbye']);
});

test('side-effects are execute when tests loaded, before test code', async t => {
	const now = Date.now();
	const sideEffect = await import('./side-effect.js');
	t.true(sideEffect.default < now);
});
