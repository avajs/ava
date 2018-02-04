import test from '../../';

test.only('only', t => {
	t.pass();
});

test('test', t => {
	t.fail();
});
