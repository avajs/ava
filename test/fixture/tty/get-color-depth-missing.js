const test = require('../../..');

const assertNoGetColorDepth = (t, stream) => {
	t.true(stream.isTTY);
	t.is(stream.getColorDepth, undefined);
};

test('stderr does not implement getColorDepth', assertNoGetColorDepth, process.stderr);
test('stdout does not implement getColorDepth', assertNoGetColorDepth, process.stdout);
