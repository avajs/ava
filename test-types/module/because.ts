/* eslint-disable @typescript-eslint/no-empty-function */
import {expectError, expectType} from 'tsd';

import test, {type BecauseTrailer} from '../../entrypoints/main.js';

expectType<BecauseTrailer>(test.failing('failing', t => {
	t.fail();
}));

expectType<BecauseTrailer>(test.skip('skip', t => {
	t.pass();
}));

expectType<BecauseTrailer>(test.todo('todo'));

expectType<BecauseTrailer>(test.serial.failing.only('failing only', t => {
	t.fail();
}));

test.failing('failing with because', t => {
	t.fail();
}).because('waiting on some/repo#123');

test.skip('skip with because', t => {
	t.pass();
}).because('waiting on some/repo#123');

test.todo('todo with because').because('waiting on some/repo#123');

{
	const result = test('regular', t => {
		t.pass();
	});
	// @ts-expect-error TS2339
	expectError(result.because('not available'));
}

{
	const trailer = test.failing('non-string because', t => {
		t.fail();
	});
	// @ts-expect-error TS2345
	expectError(trailer.because(42));
}
