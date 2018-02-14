import test from '../..';

test('this test will match', t => {
	t.pass();
});

test('this test will not match', t => {
	t.pass();
});

test('this test will also not match', t => {
	t.pass();
});
