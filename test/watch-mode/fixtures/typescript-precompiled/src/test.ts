import process from 'node:process';

import type ava from 'ava';

// This fixture is copied to a temporary directory, so import AVA through its
// configured path.
const {default: test} = await (import(process.env['TEST_AVA_IMPORT_FROM'] ?? '') as Promise<{default: typeof ava}>);

test('pass', t => {
	t.pass();
});
