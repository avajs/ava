// @flow
import test from '../../index.js.flow';

test('Named test', t => {
	t.pass('Success');
	// $ExpectError: Unknown method "unknownAssertion"
	t.unknownAssertion('Whoops');
	// $ExpectError: Unknown method "end"
	t.end();
});

test('test', t => {
	t.pass('Success');
	// $ExpectError: Unknown method "unknownAssertion"
	t.unknownAssertion('Whoops');
	// $ExpectError: Unknown method "end"
	t.end();
});

test.cb('test', t => {
	t.pass('Success');
	t.end();
});

function macro(t, input, expected) {
	t.is(eval(input), expected); // eslint-disable-line no-eval
}
macro.title = (title, input) => title || input;

function macro2(t, input, expected) {
	t.is(eval(input), expected); // eslint-disable-line no-eval
}

test('2 + 2 === 4', macro, '2 + 2', 4);
test(macro, '2 * 3', 6);

test('2 + 2 === 4', [macro, macro2], '2 + 2', 4);
test([macro, macro2], '2 * 3', 6);

function macroBadTitle(t, input, expected) {
	t.is(eval(input), expected); // eslint-disable-line no-eval
}
macroBadTitle.title = 'Not a function';
// $ExpectError: Macro "title" is not a function
test('2 + 2 === 4', macroBadTitle, '2 + 2', 4);
