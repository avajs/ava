import anyTest, {TestInterface} from 'ava';

import {concat} from '.';

const test = anyTest as TestInterface<{sort: (a: string, b: string) => number}>;

test.beforeEach(t => {
	t.context = {
		sort: (a: string, b: string) => a.localeCompare(b)
	};
});

test('concat', t => {
	t.is(concat(['b', 'c', 'a'].sort(t.context.sort)), 'a b c');
});
