import test from 'ava'; // eslint-disable-line ava/no-ignored-test-files

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.pass();
});

test.serial('cat', t => {
	t.pass();
});

test.todo('dog'); // eslint-disable-line ava/no-todo-test

/* eslint-disable max-statements-per-line, ava/no-inline-assertions */
test('sun', t => t.pass()); test('moon', t => {
	t.pass();
});
/* eslint-enable max-statements-per-line, ava/no-inline-assertions */

(() => {
	test('nested call', t => {
		t.pass();
	});
})();
