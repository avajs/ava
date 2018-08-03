import test from '../../..';

const assertNoColor = (t, stream) => {
	t.true(stream.isTTY);
	t.is(stream.getColorDepth(), 1);
};

test('stderr does not support color', assertNoColor, process.stderr);
test('stdout does not support color', assertNoColor, process.stdout);
