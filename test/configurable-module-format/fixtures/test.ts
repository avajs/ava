/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
const test = require('ava'); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, ava/no-ignored-test-files, unicorn/prefer-module

test('always passing test', t => {
	const numberWithTypes = 0;

	t.is(numberWithTypes, 0);
});
