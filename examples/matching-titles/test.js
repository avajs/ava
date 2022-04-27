'use strict';
import test from 'ava';

test('foo will run', t => {
	t.pass();
});

test('moo will also run', t => {
	t.pass();
});

test.only('boo will run but not exclusively', t => {
	t.pass();
});

test('this will not run', t => {
	t.fail();
});

test.only('neither will this...', t => {
	t.fail();
});


const macro = test.macro({
	exec(t, input, expected) {
		t.is(eval(input), expected);
	},
	title(providedTitle = '', input, expected) {
		return `${providedTitle} ${input} = ${expected}`.trim();
	}
});

// Will not run, no title provided
test(macro, '2 + 2', 4);
test('goo will run', macro, '2 + 2', 4);
