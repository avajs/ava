import test from '../../..';

const assertTTY = (t, stream) => {
	t.true(stream.isTTY);
	t.is(typeof stream.columns, 'number');
	t.is(typeof stream.rows, 'number');
};

test('stderr is a TTY', assertTTY, process.stderr);
test('stdout is a TTY', assertTTY, process.stdout);
