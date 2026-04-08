import Observable from 'zen-observable';

import test from '../../../entrypoints/main.js';

test('test', t => new Observable(() => {
	t.pass();
}));
