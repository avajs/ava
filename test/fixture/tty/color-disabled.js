import test from '../../..';

test('stdout does not support color', t => {
	t.true(process.stdout.isTTY);
	t.is(process.stdout.getColorDepth(), 1);
});
