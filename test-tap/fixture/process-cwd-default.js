import path from 'node:path';

import test from '../../entrypoints/main.js';

test('test', async t => {
	const {packageConfigSync, packageJsonPath} = await import('package-config');
	const config = packageConfigSync('ava');
	const packageDirectory = path.dirname(packageJsonPath(config));
	t.is(process.cwd(), packageDirectory);
});
