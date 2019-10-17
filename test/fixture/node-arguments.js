import test from '../..';

test('exec arguments includes --throw-deprecation and --zero-fill-buffers', t => {
	t.plan(2);
	t.truthy(process.execArgv.includes('--throw-deprecation'));
	t.truthy(process.execArgv.includes('--zero-fill-buffers'));
});
