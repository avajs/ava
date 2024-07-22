import test from 'ava';

import {sum} from './index.js';

const macro = test.macro({
	exec(t, a, b, expected) {
		t.is(sum(a, b), expected);
	},
	title: (providedTitle, a, b, expected) => `${providedTitle ?? ''} ${a}+${b} = ${expected}`.trim(),
});

test(macro, 2, 2, 4);
test(macro, 3, 3, 6);
test('providedTitle', macro, 4, 4, 8);
