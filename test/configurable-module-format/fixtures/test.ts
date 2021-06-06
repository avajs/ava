const test = require('ava'); // eslint-disable-line @typescript-eslint/no-var-requires, ava/no-ignored-test-files

test('always passing test', t => {
	const numberWithTypes = 0;

	t.is(numberWithTypes, 0);
});
