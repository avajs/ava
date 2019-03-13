import test from '../../..';

const assertTTY = (t, stream) => {
	t.true(stream.isTTY);
	t.is(typeof stream.columns, 'number');
	t.is(typeof stream.rows, 'number');
	t.is(typeof stream.clearLine, 'function');
	t.is(typeof stream.clearScreenDown, 'function');
	t.is(typeof stream.cursorTo, 'function');
	t.is(typeof stream.getWindowSize, 'function');
	t.is(typeof stream.moveCursor, 'function');
};

test('stderr is a TTY', assertTTY, process.stderr);
test('stdout is a TTY', assertTTY, process.stdout);
