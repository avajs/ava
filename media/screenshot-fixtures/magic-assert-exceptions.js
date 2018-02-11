import fs from 'fs';
import test from 'ava';

test('exception', t => {
	fs.readFileSync('non-existent-file')
});
