import test from '../../../entrypoints/main.mjs';

test('assertion should be reported before idle timeout', t => {
	t.is(1, 2);
	return new Promise(() => {});
});
