import test from '../../';

test(t => {
	t.true(process.execArgv[0].indexOf('--debug') === 0);
});
