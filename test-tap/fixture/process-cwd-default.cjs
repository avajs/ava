const path = require('path');

const { test } = require('../../entrypoints/main.cjs');

test('test', async t => {
	const {packageConfigSync, packageJsonPath} = await import('pkg-conf'); // eslint-disable-line node/no-unsupported-features/es-syntax
	const conf = packageConfigSync('ava');
	const pkgDir = path.dirname(packageJsonPath(conf));
	t.is(process.cwd(), pkgDir);
});
