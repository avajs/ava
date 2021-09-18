const test = require('../../../../entrypoints/main.cjs');

test('passes', t => t.pass());

test.todo('todo');

test.skip('skip', t => t.pass());

test('fails', t => t.fail());

test.failing('known failure', t => t.fail());

test.failing('no longer failing', t => t.pass());

test('logs', t => {
	t.log('hello');
	t.log('world');
	t.fail();
});

test('formatted', t => {
	t.deepEqual('foo', 'bar');
});

test('implementation throws non-error', () => {
	const error = null;
	throw error;
});
