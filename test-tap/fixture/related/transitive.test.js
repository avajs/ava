import test from '../../../entrypoints/main.js';

import {value} from './helper.js';

test('transitive', t => {
	t.is(value, 42);
});
