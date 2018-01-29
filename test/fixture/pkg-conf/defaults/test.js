import test from '../../../../';

const opts = JSON.parse(process.argv[2]);

test('test', t => {
	t.is(opts.failFast, false);
	t.is(opts.serial, false);
	t.is(opts.cacheEnabled, true);
	t.deepEqual(opts.require, []);
});
