const path = require('path');
const pkgConf = require('pkg-conf');
const test = require('../..');

test('test', t => {
	const conf = pkgConf.sync('ava');
	const pkgDir = path.dirname(pkgConf.filepath(conf));
	t.is(process.cwd(), pkgDir);
});
