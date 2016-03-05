import test from '../../../../';
import path from 'path';

const opts = JSON.parse(process.argv[2]);

test(t => {
	t.is(opts.failFast, false);
	t.is(opts.serial, false);
	t.is(opts.cacheEnabled, true);
	t.same(opts.match, ['foo*']);
	t.same(opts.require, [
		path.join(__dirname, "required.js")
	]);
});
