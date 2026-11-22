import process from 'node:process';

import test from '../../../entrypoints/main.js';

test.after(t => {
	t.log('\u{1B}[31mred hook log\u{1B}[39m');
});

test('passes', t => {
	t.log('\u{1B}[31mred log\u{1B}[39m');
	process.stdout.write('worker stdout\n');
	process.stderr.write('worker stderr\n');
	t.pass();
});

test.skip('skipped', () => {});
test.todo('todo');
