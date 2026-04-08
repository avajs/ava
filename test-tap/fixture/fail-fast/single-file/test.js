import test from '../../../../entrypoints/main.js';

test('first pass', t => {
	t.pass();
});

test('second fail', t => {
	t.fail();
});

test('third pass', t => {
	t.pass();
});
