import test from '../..';

test('test', t => {
	t.true(process.execArgv[0].startsWith('--debug'));
});
