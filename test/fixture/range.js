import test from '../..';

test('foo', t => {
	t.pass();
});

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.is(1, 1);
	t.pass();
});
