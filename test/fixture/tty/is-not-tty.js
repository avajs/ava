const test = require('../../..');

const assertNotTTY = (t, stream) => {
	t.falsy(stream.isTTY);
	t.falsy(stream.getColorDepth);
	t.falsy(stream.columns);
	t.falsy(stream.rows);
};

test('stderr is not a TTY', assertNotTTY, process.stderr);
test('stdout is not a TTY', assertNotTTY, process.stdout);
