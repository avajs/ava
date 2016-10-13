import test from '../../';
import pkgConf from 'pkg-conf'
import path from 'path'

test(t => {
	var conf = pkgConf.sync('ava')
	var pkgDir = path.dirname(pkgConf.filepath(conf))
	t.is(process.cwd(), pkgDir)
});
