const test = require('../..');

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.pass();
});

test.serial('cat', t => {
	t.pass();
});

test.todo('dog');

/* eslint-disable max-statements-per-line */
test('sun', t => t.pass()); test('moon', t => {
	t.pass();
});
/* eslint-enable max-statements-per-line */

(() => {
	test('nested call', t => {
		t.pass();
	});
})();
