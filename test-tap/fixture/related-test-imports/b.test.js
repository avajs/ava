import test from '../../../entrypoints/main.js';

import {value} from './a.test.js';

test('importing-test', t => {
	t.is(value, 42);
});
