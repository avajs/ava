const test = require('ava');

const {sum} = require('.');

function macro(t, a, b, expected) {
	t.is(sum(a, b), expected);
}

macro.title = (providedTitle, a, b, expected) => `${providedTitle || ''} ${a}+${b} = ${expected}`.trim();

test(macro, 2, 2, 4);
test(macro, 3, 3, 6);
test('providedTitle', macro, 4, 4, 8);
