import test from '../../entrypoints/main.js';

Error.stackTraceLimit = 1; // eslint-disable-line unicorn/no-nonstandard-builtin-properties

test('test', t => {
	const c = () => t.fail();
	const b = () => c();
	const a = () => b();

	a();
});
