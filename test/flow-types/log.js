// @flow
import test from '../../index.js.flow';

test('log', t => {
	t.pass();
	t.log({object: true}, 42, ['array'], false, new Date(), new Map());
});
