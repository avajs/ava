import test from 'ava';

test.failing('does foo', t => {
	t.fail();
}).because('waiting on some/repo#123');

test.skip('skipped', t => {
	t.fail();
}).because('not ready yet');

test.todo('later').because('needs design');
