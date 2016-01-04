import test from '../../../../';
import path from 'path';

const opts = JSON.parse(process.argv[2]);

test(t => {
	t.is(opts.failFast, true);
	t.is(opts.serial, true);
	t.is(opts.cacheEnabled, false);
	t.same(opts.require, [
		path.join(__dirname, "required.js")
	]);
});
