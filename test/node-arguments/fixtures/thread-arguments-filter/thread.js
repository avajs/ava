import test from 'ava';

test('exec arguments filtered', t => {
	t.plan(2);
	t.truthy(process.execArgv.includes('--throw-deprecation'));
	t.falsy(process.execArgv.includes('--allow-natives-syntax'));
});
