import test from '../../../..';

console.log('stdout');
console.error('stderr');

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

test('power-assert', t => {
	const foo = 'bar';
	t.falsy(foo);
});

test('bad throws', t => {
	const fn = () => {
		throw new Error('err');
	};
	t.throws(fn());
});

test('bad notThrows', t => {
	const fn = () => {
		throw new Error('err');
	};
	t.notThrows(fn());
});

test('implementation throws non-error', () => {
	const err = null;
	throw err;
});
