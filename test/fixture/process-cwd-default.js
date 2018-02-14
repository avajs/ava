import path from 'path';
import pkgConf from 'pkg-conf';
import test from '../..';

test('test', t => {
	const conf = pkgConf.sync('ava');
	const pkgDir = path.dirname(pkgConf.filepath(conf));
	t.is(process.cwd(), pkgDir);
});
