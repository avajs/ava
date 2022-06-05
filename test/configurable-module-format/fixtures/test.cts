const test = require('ava'); // eslint-disable-line ava/no-ignored-test-files

// @ts-expect-error TS2345
test('always passing test', t => {
	const numberWithTypes = 0;

	t.is(numberWithTypes, 0);
});
