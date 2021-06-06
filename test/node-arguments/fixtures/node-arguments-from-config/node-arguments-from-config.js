import test from 'ava';

test('works', t => {
	t.plan(2);
	t.truthy(global.SETUP_CALLED, 'setup variable set');
	t.truthy(process.execArgv.some(argv => argv.startsWith('--require')), 'require passed');
});
