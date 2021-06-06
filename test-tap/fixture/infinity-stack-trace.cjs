const test = require('../../entrypoints/main.cjs');

Error.stackTraceLimit = 1;

test('test', t => {
	const c = () => t.fail();
	const b = () => c();
	const a = () => b();

	a();
});
