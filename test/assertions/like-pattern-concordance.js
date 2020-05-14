const test = require('@ava/test');

const likePatternConcordance = require('../../lib/like-pattern-concordance');

const passesMacro = (t, actual, likePattern, expectedActualPicked) => {
	const {actualPicked, result} = likePatternConcordance.compare(actual, likePattern);
	t.true(result.pass);
	t.deepEqual(actualPicked, expectedActualPicked);
};

const failsMacro = (t, actual, likePattern, expectedActualPicked) => {
	const {actualPicked, result} = likePatternConcordance.compare(actual, likePattern);
	t.false(result.pass);
	t.deepEqual(actualPicked, expectedActualPicked);
};

test('`actual` equals `likePattern`', passesMacro, {a: 'a'}, {a: 'a'}, {a: 'a'});
test('`actual` equals `likePattern` but has extra keys', passesMacro, {a: 'a', b: 'b'}, {a: 'a'}, {a: 'a'});

test('`actual` not equals `likePattern`', failsMacro, {a: 'a'}, {a: 'b'}, {a: 'a'});
test('`actual` is not like `likePattern` and has extra keys', failsMacro, {a: 'a', b: 'b'}, {a: 'b'}, {a: 'a'});
