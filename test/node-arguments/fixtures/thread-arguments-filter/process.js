import test from 'ava';

test('exec arguments unfiltered', t => {
	t.plan(2);
	t.truthy(process.execArgv.includes('--throw-deprecation'));
	t.truthy(process.execArgv.includes('--allow-natives-syntax'));
});
