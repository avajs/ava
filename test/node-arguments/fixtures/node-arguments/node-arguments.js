import test from 'ava';

test('exec arguments includes --throw-deprecation', t => {
	t.plan(1);
	t.truthy(process.execArgv.includes('--throw-deprecation'));
});
