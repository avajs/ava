import test from '../../';

test('passCount', t => {
	t.pass();
});

test('failCount', t => {
	t.fail();
});

test.skip('skipCount', t => {
	t.pass();
});

test.todo('todoCount');
