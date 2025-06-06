const test = require('ava'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, unicorn/prefer-module

// @ts-expect-error TS2345
test('always passing test', t => { // eslint-disable-line @typescript-eslint/no-unsafe-call
	const numberWithTypes = 0;

	t.is(numberWithTypes, 0); // eslint-disable-line @typescript-eslint/no-unsafe-call
});
