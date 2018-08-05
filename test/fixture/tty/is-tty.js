import test from '../../..';

test('stdout is a TTY', t => {
	t.true(process.stdout.isTTY);
	t.is(typeof process.stdout.columns, 'number');
	t.is(typeof process.stdout.rows, 'number');
});
