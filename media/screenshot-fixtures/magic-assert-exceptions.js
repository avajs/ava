import fs from 'node:fs';

import test from 'ava';

test('exception', () => {
	fs.readFileSync('non-existent-file');
});
