import test from '../../..';

test('stdout supports color', t => {
	t.true(process.stdout.isTTY);
	const colorDepth = process.stdout.getColorDepth();
	t.is(typeof colorDepth, 'number');
	t.true(colorDepth > 1);
});
