import anyTest, {type TestFn} from 'ava';

import {concat} from './index.js';

const test = anyTest as TestFn<{sort: (a: string, b: string) => number}>;

test.before(t => {
	t.context = {
		sort: (a: string, b: string) => a.localeCompare(b)
	};
});

test('concat', t => {
	t.is(concat(['b', 'c', 'a'].sort(t.context.sort)), 'a b c');
});
