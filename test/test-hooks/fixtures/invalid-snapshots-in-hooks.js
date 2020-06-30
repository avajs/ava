const test = require('ava');

test.before(t => {
	t.snapshot({}, 'can not use snapshot in hook');
});

test('can not use snapshot in hook', t => {
	t.pass();
});
