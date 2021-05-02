const test = require('../../entrypoints/main.cjs');

test('passCount', t => {
	t.pass();
});

test('passCount2', t => {
	t.pass();
});

test('failCount', t => {
	t.fail();
});

test.skip('skipCount', t => {
	t.pass();
});

test.todo('todoCount');
