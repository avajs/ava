const path = require('node:path');

const test = require('../../entrypoints/main.cjs');

test('test', async t => {
	const {packageConfigSync, packageJsonPath} = await import('package-config');
	const config = packageConfigSync('ava');
	const packageDirectory = path.dirname(packageJsonPath(config));
	t.is(process.cwd(), packageDirectory);
});
