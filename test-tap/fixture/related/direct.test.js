import test from '../../../entrypoints/main.js';

import {value} from './source.js';

test('direct', t => {
	t.is(value, 42);
});
