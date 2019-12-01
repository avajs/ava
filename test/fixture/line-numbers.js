import test from '../..';

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.pass();
});

test.serial('cat', t => {
	t.pass();
});

test.todo('dog');
