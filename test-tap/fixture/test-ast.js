const test = require('../..');

test('unicorn', t => {
	t.pass();
});

test('rainbow', t => {
	t.pass();
});

/* eslint-disable max-statements-per-line */
test('cat', t => t.pass()); test('dog', t => {
	t.pass();
});
/* eslint-enable max-statements-per-line */
