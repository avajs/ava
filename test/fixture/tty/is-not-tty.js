import test from '../../..';

test('stdout is not a TTY', t => {
	t.falsy(process.stdout.isTTY);
	t.falsy(process.stdout.getColorDepth);
	t.falsy(process.stdout.columns);
	t.falsy(process.stdout.rows);
});
