import test from '../../..';

test('works', t => {
	t.plan(2);
	t.truthy(global.SETUP_CALLED);
	t.truthy(process.execArgv.includes('--require'));
});
