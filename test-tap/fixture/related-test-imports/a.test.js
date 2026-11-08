import test from '../../../entrypoints/main.js';

export const value = 42;

// eslint-disable-next-line unicorn/no-top-level-side-effects -- Test modules can themselves be dependencies.
test('source-test', t => {
	t.pass();
});
