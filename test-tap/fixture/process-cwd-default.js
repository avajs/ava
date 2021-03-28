const path = require('path');
const pkgConf = require('pkg-conf');
const test = require('../../entrypoints/main.cjs');

test('test', t => {
	const conf = pkgConf.sync('ava');
	const pkgDir = path.dirname(pkgConf.filepath(conf));
	t.is(process.cwd(), pkgDir);
});
