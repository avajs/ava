import test from '../../..';

test('stdout does not implement getColorDepth', t => {
	t.true(process.stdout.isTTY);
	t.is(process.stdout.getColorDepth, undefined);
});
