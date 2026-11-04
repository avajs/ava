import test from '../../../entrypoints/main.js';

let completed = 0;

test.before(t => {
	t.context.ready = true;
});

for (const title of ['second', 'first', 'third']) {
	test(title, t => {
		t.true(t.context.ready);
		t.snapshot({title});
		completed++;
	});
}

test.skip('skipped', () => {
	throw new Error('Skipped tests must not run');
});
test.todo('todo');
test.after(t => {
	t.is(completed, 3);
});
