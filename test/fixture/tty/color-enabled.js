import test from '../../..';

const assertColor = (t, stream) => {
	t.true(stream.isTTY);
	const colorDepth = stream.getColorDepth();
	t.is(typeof colorDepth, 'number');
	t.true(colorDepth > 1);
};

test('stderr supports color', assertColor, process.stderr);
test('stdout supports color', assertColor, process.stdout);
